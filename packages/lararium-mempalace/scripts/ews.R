#!/usr/bin/env Rscript
# ews.R — the THIN R sidecar for the PREDICTIVE bands leg's early-warning-signals route
# (sensorium-rhymes.md #the-predictive-upgrade, the dynamical-systems leg).
#
# The causal-island boundary made crossable for what R's `earlywarnings` owns: `generic_ews`
# (rolling lag-1-AC / variance / skewness + their Kendall-τ trends) and `surrogates_ews` (the
# ARMA-null false-positive guard → a p-value on the trend). The python `bands_sidecar._ews_R`
# calls this WHEN earlywarnings is installed; a missing R / missing earlywarnings degrades to
# the native numpy estimators (never fatal), exactly like bands_ecp.R → ruptures.
#
# drawer_io-style NDJSON over stdio: ONE request on stdin, ONE response on stdout.
#   in : {"op":"generic_ews","x":[..],"window":50}
#   out: {"ok":true,"ar1_tau":..,"var_tau":..,"skew_tau":..,"ar1_p":..,"var_p":..,"engine":"earlywarnings-R"}
#        {"ok":false,"error":".."}   (earlywarnings absent / a fault ⇒ native fallback)
#
# Run:  Rscript --vanilla ews.R  < request.ndjson
#
# Meme: lar:///ha.ka.ba/@lares/api/pono/sensorium-rhymes#the-predictive-upgrade

# Add the user library so a --user install of earlywarnings is visible.
suppressWarnings(try(.libPaths(c(Sys.getenv("R_LIBS_USER"), .libPaths())), silent = TRUE))

suppressWarnings(suppressMessages({
  have_json <- requireNamespace("jsonlite", quietly = TRUE)
  have_ews  <- requireNamespace("earlywarnings", quietly = TRUE)
  have_kend <- requireNamespace("Kendall", quietly = TRUE)
}))

emit <- function(obj) {
  if (have_json) {
    cat(jsonlite::toJSON(obj, auto_unbox = TRUE, digits = 8), "\n", sep = "")
  } else {
    cat('{"ok":false,"error":"jsonlite-not-installed"}\n')
  }
}

if (!have_json) { cat('{"ok":false,"error":"jsonlite-not-installed"}\n'); quit(status = 0) }
if (!have_ews)  { emit(list(ok = FALSE, error = "earlywarnings-not-installed")); quit(status = 0) }

con <- file("stdin", open = "r"); lines <- readLines(con, warn = FALSE); close(con)
line <- lines[nchar(trimws(lines)) > 0]
if (length(line) == 0) { emit(list(ok = FALSE, error = "empty-request")); quit(status = 0) }

req <- tryCatch(jsonlite::fromJSON(line[[length(line)]]), error = function(e) NULL)
if (is.null(req) || is.null(req$x)) { emit(list(ok = FALSE, error = "bad-request")); quit(status = 0) }

x <- as.numeric(unlist(req$x))
win <- if (!is.null(req$window)) as.integer(req$window) else 50L
if (length(x) < 12) { emit(list(ok = FALSE, error = "too-few-samples")); quit(status = 0) }

# winsize is a PERCENT of the series in earlywarnings::generic_ews.
winpct <- max(5, min(90, round(100 * win / length(x))))

tau_of <- function(v) {
  v <- v[is.finite(v)]
  if (length(v) < 3) return(0.0)
  if (have_kend) as.numeric(Kendall::MannKendall(v)$tau) else suppressWarnings(cor(seq_along(v), v, method = "kendall"))
}
p_of <- function(v) {
  v <- v[is.finite(v)]
  if (length(v) < 3 || !have_kend) return(1.0)
  as.numeric(Kendall::MannKendall(v)$sl)  # two-sided; the python guard also runs its own surrogate
}

res <- tryCatch(
  earlywarnings::generic_ews(x, winsize = winpct, detrending = "no", logtransform = FALSE),
  error = function(e) NULL
)
if (is.null(res)) { emit(list(ok = FALSE, error = "generic_ews-fault")); quit(status = 0) }

ar1 <- res$ar1
va  <- res$sd^2
sk  <- res$sk

emit(list(
  ok = TRUE,
  ar1_tau = tau_of(ar1), var_tau = tau_of(va), skew_tau = tau_of(sk),
  ar1_p = p_of(ar1), var_p = p_of(va),
  n_windows = length(ar1),
  engine = "earlywarnings-R"
))
