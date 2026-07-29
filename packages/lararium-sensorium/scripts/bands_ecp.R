#!/usr/bin/env Rscript
# bands_ecp.R — the THIN R leg for the bands cap's TREE layer (corpus.md #the-bands).
#
# The causal-island boundary made crossable for the ONE thing R owns better than python:
# `ecp::e.divisive` — nonparametric, MULTIVARIATE, divisive hierarchical changepoint
# detection (Matteson & James 2014). The divisive discovery ORDER is the nested tree
# (coarse cuts found before fine), which the python side maps onto the aperture bands.
#
# drawer_io-style NDJSON over stdio (the established holder contract): ONE request object
# on stdin, ONE response object on stdout. The python `bands._ecp_divisive_R` calls
# this; a missing R / missing ecp degrades to the ruptures python path (never fatal).
#
#   in : {"op":"e_divisive","matrix":[[..],[..],..],"min_size":2,"sig_lvl":0.05}
#   out: {"ok":true,"order":[c1,c2,..],"engine":"ecp-e.divisive"}   (0-based cut indices)
#        {"ok":false,"error":"..."}                                  (ecp absent / a fault)
#
# Run:  Rscript --vanilla bands_ecp.R  < request.ndjson
#
# Meme: lar:///ha.ka.ba/lares/api/lares/corpus#the-bands

suppressWarnings(suppressMessages({
  have_json <- requireNamespace("jsonlite", quietly = TRUE)
  have_ecp  <- requireNamespace("ecp", quietly = TRUE)
}))

emit <- function(obj) {
  if (have_json) {
    cat(jsonlite::toJSON(obj, auto_unbox = TRUE), "\n", sep = "")
  } else {
    # minimal hand-rolled JSON when jsonlite is absent (order-only)
    if (isTRUE(obj$ok)) {
      cat('{"ok":true,"order":[', paste(obj$order, collapse = ","), '],"engine":"ecp-e.divisive"}\n', sep = "")
    } else {
      cat('{"ok":false,"error":"', obj$error, '"}\n', sep = "")
    }
  }
}

if (!have_ecp) {
  emit(list(ok = FALSE, error = "ecp-not-installed"))
  quit(status = 0)
}
if (!have_json) {
  emit(list(ok = FALSE, error = "jsonlite-not-installed"))
  quit(status = 0)
}

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

if (is.null(M) || nrow(M) < 4) {
  emit(list(ok = FALSE, error = "matrix-too-small"))
  quit(status = 0)
}

min_size <- if (!is.null(req$min_size)) as.integer(req$min_size) else 2L
sig_lvl  <- if (!is.null(req$sig_lvl)) as.numeric(req$sig_lvl) else 0.05

res <- tryCatch(
  ecp::e.divisive(M, min.size = max(2L, min_size), sig.lvl = sig_lvl, R = 199),
  error = function(e) NULL
)
if (is.null(res)) {
  emit(list(ok = FALSE, error = "e.divisive-fault"))
  quit(status = 0)
}

# e.divisive `estimates` are 1-based segment BOUNDARIES including the endpoints (1 and n+1);
# `order.found` holds the DISCOVERY order (the divisive hierarchy). Convert the interior
# estimates to 0-based cut indices, ordered by discovery so coarse cuts lead.
est <- res$estimates
n <- nrow(M)
interior <- est[est > 1 & est <= n]           # drop the endpoints
cuts0 <- sort(unique(as.integer(interior) - 1L))  # → 0-based

order_found <- res$order.found
ordered <- integer(0)
if (!is.null(order_found)) {
  for (e in order_found) {
    c0 <- as.integer(e) - 1L
    if (c0 %in% cuts0 && !(c0 %in% ordered)) ordered <- c(ordered, c0)
  }
}
# Any interior cut not named in order.found tails on (still coarse→fine overall).
ordered <- c(ordered, setdiff(cuts0, ordered))

emit(list(ok = TRUE, order = ordered, engine = "ecp-e.divisive"))
