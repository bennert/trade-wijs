"""Trade wijs web app main module."""
from urllib.parse import unquote

from flask import Flask, jsonify, make_response, render_template, request

from app_services import (
    fetch_chart_payload,
    fetch_exchange_settings_options_payload,
    fetch_market_quote_payload,
    get_git_version,
)

app = Flask(__name__)


def _decode_request_value(value):
    if isinstance(value, str):
        return unquote(value)
    return value


@app.route("/")
def index():
    """Main page route."""
    requested_timeframe = _decode_request_value(
        request.args.get("timeframe") or request.cookies.get("trade_wijs_timeframe")
    )
    requested_exchange = _decode_request_value(
        request.args.get("exchange") or request.cookies.get("trade_wijs_exchange")
    )
    requested_symbol = _decode_request_value(
        request.args.get("symbol") or request.cookies.get("trade_wijs_symbol")
    )

    payload = fetch_chart_payload(
        requested_timeframe,
        requested_exchange,
        requested_symbol,
    )
    payload["app_version"] = get_git_version()

    response = make_response(render_template("index.html", **payload))
    cookie_ttl = 60 * 60 * 24 * 365
    response.set_cookie(
        "trade_wijs_timeframe",
        payload["market_data"]["timeframe"],
        max_age=cookie_ttl,
        samesite="Lax",
    )
    response.set_cookie(
        "trade_wijs_exchange",
        payload["market_data"]["exchange_key"],
        max_age=cookie_ttl,
        samesite="Lax",
    )
    response.set_cookie(
        "trade_wijs_symbol",
        payload["market_data"]["symbol"],
        max_age=cookie_ttl,
        samesite="Lax",
    )
    return response


@app.route("/api/chart-data")
def chart_data():
    """API route for fetching chart data as JSON."""
    requested_mode = _decode_request_value(request.args.get("mode"))
    normalized_mode = "delta" if str(requested_mode).lower() == "delta" else "full"
    return jsonify(
        fetch_chart_payload(
            _decode_request_value(request.args.get("timeframe")),
            _decode_request_value(request.args.get("exchange")),
            _decode_request_value(request.args.get("symbol")),
            include_symbol_volumes=False,
            payload_mode=normalized_mode,
        )
    )


@app.route("/api/market-quote")
def market_quote():
    """API route for fetching lightweight market quote updates as JSON."""
    return jsonify(
        fetch_market_quote_payload(
            _decode_request_value(request.args.get("exchange")),
            _decode_request_value(request.args.get("symbol")),
            _decode_request_value(request.args.get("timeframe")),
        )
    )


@app.route("/api/exchange-settings-options")
def exchange_settings_options():
    """API route for fetching exchange-specific settings options as JSON."""
    return jsonify(
        fetch_exchange_settings_options_payload(
            _decode_request_value(request.args.get("exchange")),
        )
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3175)
