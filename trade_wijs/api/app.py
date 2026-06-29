"""Flask application entrypoint for Trade Wijs."""

import json
from pathlib import Path

from flask import Flask, jsonify, make_response, render_template, request

from app_services_paper_trading import _update_order_status as app_update_order_status
from trade_wijs.application.use_cases import (
    ChartRequest,
    FetchChartUseCase,
    MarketQuoteRequest,
    FetchMarketQuoteUseCase,
    ExchangeSettingsRequest,
    FetchExchangeSettingsUseCase,
    PaperTradeStateRequest,
    FetchPaperTradeStateUseCase,
    PlacePaperOrderRequest,
    PlacePaperOrderUseCase,
    ResetPaperTradeStateRequest,
    ResetPaperTradeStateUseCase,
)

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
app = Flask(
    __name__,
    template_folder=str(_PROJECT_ROOT / "templates"),
    static_folder=str(_PROJECT_ROOT / "static"),
)

# Initialize use cases (stateless, single-instance pattern)
_fetch_chart_use_case = FetchChartUseCase()
_fetch_market_quote_use_case = FetchMarketQuoteUseCase()
_fetch_exchange_settings_use_case = FetchExchangeSettingsUseCase()
_fetch_paper_trade_state_use_case = FetchPaperTradeStateUseCase()
_place_paper_order_use_case = PlacePaperOrderUseCase()
_reset_paper_trade_state_use_case = ResetPaperTradeStateUseCase()


@app.route("/")
def index():
    """Main page route: render template with chart payload and set preference cookies."""
    # Build request from Flask args and cookies
    chart_request = ChartRequest.from_flask_args(request.args, request.cookies)
    
    # Execute use case
    chart_response = _fetch_chart_use_case(chart_request)
    
    # Build HTTP response
    response = make_response(
        render_template("index.html", **chart_response.payload)
    )
    
    # Set cookies from use case
    for cookie_name, cookie_config in chart_response.cookies.items():
        response.set_cookie(
            cookie_name,
            cookie_config["value"],
            max_age=cookie_config["max_age"],
            samesite=cookie_config["samesite"],
        )
    
    return response


@app.route("/api/chart-data")
def chart_data():
    """API route for fetching chart data as JSON."""
    # Build request from Flask args
    chart_request = ChartRequest.from_flask_args(request.args)
    
    # Execute use case
    chart_response = _fetch_chart_use_case(chart_request)
    
    # Return JSON response
    return jsonify(chart_response.payload)


@app.route("/api/market-quote")
def market_quote():
    """API route for fetching lightweight market quote updates as JSON."""
    # Build request from Flask args
    quote_request = MarketQuoteRequest.from_flask_args(request.args)
    
    # Execute use case
    quote_response = _fetch_market_quote_use_case(quote_request)
    
    # Return JSON response
    return jsonify(quote_response.payload)


@app.route("/api/exchange-settings-options")
def exchange_settings_options():
    """API route for fetching exchange-specific settings options as JSON."""
    # Build request from Flask args
    settings_request = ExchangeSettingsRequest.from_flask_args(request.args)
    
    # Execute use case
    settings_response = _fetch_exchange_settings_use_case(settings_request)
    
    # Return JSON response
    return jsonify(settings_response.payload)


@app.route("/api/paper-trade/state")
def paper_trade_state():
    """API route for fetching current paper trade balances, position, and recent orders."""
    state_request = PaperTradeStateRequest.from_flask_args(request.args)
    state_response = _fetch_paper_trade_state_use_case(state_request)
    return jsonify(state_response.payload)


@app.route("/api/paper-trade/order", methods=["POST"])
def place_paper_order():
    """API route for placing a paper trade order using simulated execution."""
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            try:
                payload = json.loads((request.data or b"{}").decode("utf-8"))
            except (ValueError, TypeError, UnicodeDecodeError):
                payload = {}

        place_order_request = PlacePaperOrderRequest.from_json(payload)
        place_order_response = _place_paper_order_use_case(place_order_request)
        return jsonify(place_order_response.payload)
    except ValueError as error:
        return jsonify({"error": str(error), "paper_mode": True}), 400


@app.route("/api/paper-trade/reset", methods=["POST"])
def reset_paper_trade_state():
    """API route for resetting paper trade state for one exchange or all exchanges."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        try:
            payload = json.loads((request.data or b"{}").decode("utf-8"))
        except (ValueError, TypeError, UnicodeDecodeError):
            payload = {}

    reset_request = ResetPaperTradeStateRequest.from_json(payload)
    reset_response = _reset_paper_trade_state_use_case(reset_request)
    return jsonify(reset_response.payload)


@app.route("/api/paper-trade/orders/<int:order_id>/fill", methods=["POST"])
def fill_paper_order(order_id):
    """API route for filling a pending paper trade order."""
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            try:
                payload = json.loads((request.data or b"{}").decode("utf-8"))
            except (ValueError, TypeError, UnicodeDecodeError):
                payload = {}

        exchange = payload.get("exchange", "")
        result = app_update_order_status(exchange, order_id, "filled")
        return jsonify(result)
    except ValueError as error:
        return jsonify({"error": str(error), "paper_mode": True}), 400


@app.route("/api/paper-trade/orders/<int:order_id>/cancel", methods=["POST"])
def cancel_paper_order(order_id):
    """API route for cancelling a pending paper trade order."""
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            try:
                payload = json.loads((request.data or b"{}").decode("utf-8"))
            except (ValueError, TypeError, UnicodeDecodeError):
                payload = {}

        exchange = payload.get("exchange", "")
        result = app_update_order_status(exchange, order_id, "cancelled")
        return jsonify(result)
    except ValueError as error:
        return jsonify({"error": str(error), "paper_mode": True}), 400


def main():
    """Run the development web server."""
    app.run(host="0.0.0.0", port=3175)


if __name__ == "__main__":
    main()
