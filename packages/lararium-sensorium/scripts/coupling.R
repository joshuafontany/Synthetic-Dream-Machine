#!/usr/bin/env Rscript
# coupling.R — the THIN R sidecar for the sensorium's CROSS-STREAM COUPLING plane.
#
# The causal-island boundary made crossable for the OTHER thing R owns better than python:
# `RTransferEntropy::calc_ete` — the effective (bias-corrected, Shannon) TRANSFER ENTROPY,
# a DIRECTIONAL, model-free lead-lag measure. Over N signals it builds the pairwise
# who-leads-whom matrix: ete[i][j] = the effective information flow signal i → signal j.
# Bootstrap p-values ride alongside — a source-permutation null (break i's temporal tie to
# j, recompute TE) certifies each directed edge (the coupling plane's convergence gate).
#
# drawer_io-style NDJSON over stdio (the established sidecar contract, twin of bands_ecp.R):
# ONE request object on stdin, ONE response object on stdout. The python
# `bands_sidecar._couple_ete_R` calls this; a missing R / RTransferEntropy degrades to a
# graceful skip (coupling has NO python fallback — TE is the R plane, never fatal).
#
#   in : {"op":"couple","matrix":[[..],[..],..],"lx":1,"ly":1,"shuffles":100,
#          "nboot":100,"q":0.1,"quantiles":[5,95],"seed":1,"names":["a","b",..],
#          "whiten":false,"alpha":0.3}
#          matrix rows = time steps, cols = SIGNALS (mirrors bands_ecp.R's row=observation).
#          whiten:true → Surface-A: each signal reduces to its signed EWMA innovation before
#          calc_ete (the TE prewhitening); whiten:false (default) → Surface-B: couples RAW.
#   out: {"ok":true,"engine":"RTransferEntropy-calc_ete","n_signals":K,
#          "names":[..],"ete":[[KxK]],"te":[[KxK]],"pval":[[KxK]],"nboot":N}
#          ete/te/pval diagonals are null (-1); ete[i][j] reads i→j (row leads col).
#        {"ok":false,"error":"..."}   (RTransferEntropy absent / a fault)
#
# Run:  Rscript --vanilla coupling.R  < request.ndjson
#
# Meme: lar:///ha.ka.ba/lares/api/lares/corpus#the-bands

suppressWarnings(suppressMessages({
  have_json <- requireNamespace("jsonlite", quietly = TRUE)
  have_rte  <- requireNamespace("RTransferEntropy", quietly = TRUE)
}))

emit <- function(obj) {
  if (have_json) {
    cat(jsonlite::toJSON(obj, auto_unbox = TRUE, na = "null", matrix = "rowmajor"), "\n", sep = "")
  } else {
    cat('{"ok":false,"error":"jsonlite-not-installed"}\n', sep = "")
  }
}

if (!have_json) {
  cat('{"ok":false,"error":"jsonlite-not-installed"}\n', sep = "")
  quit(status = 0)
}
if (!have_rte) {
  emit(list(ok = FALSE, error = "RTransferEntropy-not-installed"))
  quit(status = 0)
}

suppressWarnings(suppressMessages(library(RTransferEntropy)))

con <- file("stdin", open = "r")
lines <- readLines(con, warn = FALSE)
close(con)
line <- lines[nchar(trimws(lines)) > 0]
if (length(line) == 0) {
  emit(list(ok = FALSE, error = "empty-request"))
  quit(status = 0)
}

req <- tryCatch(jsonlite::fromJSON(line[[length(line)]]), error = function(e) NULL)
if (is.null(req) || is.null(req$matrix)) {
  emit(list(ok = FALSE, error = "bad-request"))
  quit(status = 0)
}

M <- tryCatch({
  m <- req$matrix
  if (is.list(m)) do.call(rbind, lapply(m, function(r) as.numeric(unlist(r)))) else as.matrix(m)
}, error = function(e) NULL)

if (is.null(M) || !is.matrix(M) || nrow(M) < 8 || ncol(M) < 2) {
  emit(list(ok = FALSE, error = "matrix-too-small"))  # need ≥2 signals, ≥8 samples
  quit(status = 0)
}

K        <- ncol(M)
lx       <- if (!is.null(req$lx)) as.integer(req$lx) else 1L
ly       <- if (!is.null(req$ly)) as.integer(req$ly) else 1L
shuffles <- if (!is.null(req$shuffles)) as.integer(req$shuffles) else 100L
nboot    <- if (!is.null(req$nboot)) as.integer(req$nboot) else 100L
qv       <- if (!is.null(req$q)) as.numeric(req$q) else 0.1
quants   <- if (!is.null(req$quantiles)) as.numeric(unlist(req$quantiles)) else c(5, 95)
seed0    <- if (!is.null(req$seed)) as.integer(req$seed) else 1L
nm       <- if (!is.null(req$names)) as.character(unlist(req$names)) else paste0("s", seq_len(K))
if (length(nm) != K) nm <- paste0("s", seq_len(K))

# WHITENING pre-step (Surface-A) — the R twin of mesh/signed-innovation.ts + predictive_coding.py.
# coupling.R couples RAW by default (Surface-B); a `whiten:true` request reduces each signal to its
# signed one-step EWMA innovation ε = actual − predicted BEFORE calc_ete, so the effective TE reads
# the NEW information a source carries, never the self-inertia a self-predictable target inflates
# (Behrendt 2022: raw TE fails on autocorrelated targets). The reduction stays byte-identical to the
# TS/py kernel: predict-before-update, the first frame opens at 0, the sign survives.
ewma_innovation <- function(x, alpha) {
  n <- length(x)
  if (n <= 1) return(numeric(n))       # no history → no innovation
  pred <- numeric(n)
  s <- x[1]
  pred[1] <- s                          # first frame predicts itself → residual 0
  for (t in 2:n) {
    pred[t] <- s                        # predict from the state BEFORE seeing x[t]
    s <- (1 - alpha) * s + alpha * x[t] # UPDATE the running forecast with the observation
  }
  x - pred                              # signed residual; the whitened signal
}
do_whiten <- if (!is.null(req$whiten)) isTRUE(req$whiten) else FALSE
alpha_w   <- if (!is.null(req$alpha)) as.numeric(req$alpha) else 0.3
if (do_whiten) {
  M <- apply(M, 2L, function(col) ewma_innovation(col, alpha_w))  # per-column, cols preserved
  if (!is.matrix(M)) M <- matrix(M, ncol = K)
}

# calc_te (raw transfer entropy) — the permutation-null STATISTIC. calc_ete (effective TE,
# shuffle-bias-corrected) — the reported EFFECT SIZE. The p-value tests the observed te
# against a null built by permuting the SOURCE (severs its temporal tie to the target),
# recomputing te on each of `nboot` permutations. p = (1 + #{null ≥ obs}) / (nboot + 1).
te_of <- function(x, y) {
  tryCatch(
    calc_te(x, y, lx = lx, ly = ly, q = qv, entropy = "Shannon",
            shuffles = shuffles, quantiles = quants, na.rm = TRUE),
    error = function(e) NA_real_
  )
}
ete_of <- function(x, y) {
  tryCatch(
    calc_ete(x, y, lx = lx, ly = ly, q = qv, entropy = "Shannon",
             shuffles = shuffles, quantiles = quants, na.rm = TRUE),
    error = function(e) NA_real_
  )
}

ete  <- matrix(NA_real_, K, K)
te   <- matrix(NA_real_, K, K)
pval <- matrix(NA_real_, K, K)

set.seed(seed0)
n <- nrow(M)
for (i in seq_len(K)) {
  for (j in seq_len(K)) {
    if (i == j) next
    x <- M[, i]; y <- M[, j]           # test i → j (source i leads target j)
    e_ij <- ete_of(x, y)
    t_ij <- te_of(x, y)
    ete[i, j] <- e_ij
    te[i, j]  <- t_ij
    if (!is.na(t_ij) && nboot > 0) {
      ge <- 0L
      for (b in seq_len(nboot)) {
        xs <- x[sample.int(n)]          # permute the source → the no-flow null
        t_null <- te_of(xs, y)
        if (!is.na(t_null) && t_null >= t_ij) ge <- ge + 1L
      }
      pval[i, j] <- (1 + ge) / (nboot + 1)
    }
  }
}

emit(list(
  ok = TRUE,
  engine = "RTransferEntropy-calc_ete",
  n_signals = K,
  names = nm,
  ete = ete,
  te = te,
  pval = pval,
  nboot = nboot
))
