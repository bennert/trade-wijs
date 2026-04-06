"""Flask application entrypoint for Trade Wijs."""

from pathlib import Path

from flask import Flask, jsonify, make_response, render_template, request

from trade_wijs.application.use_cases import (
    ChartRequest,
    FetchChartUseCase,
    MarketQuoteRequest,
    FetchMarketQuoteUseCase,
    ExchangeSettingsRequest,
    FetchExchangeSettingsUseCase,
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


def main():
    """Run the development web server."""
    app.run(host="0.0.0.0", port=3175)


if __name__ == "__main__":
    main()
