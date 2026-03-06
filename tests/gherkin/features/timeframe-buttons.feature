Feature: Timeframe buttons on the homepage

  Scenario Outline: Timeframe buttons are shown on the homepage
    Given the Trade Wijs homepage
    When I open the homepage
    Then the page title is visible
    And the timeframe buttons block is visible
    And there is at least 1 timeframe button
    And the <timeframe> button is visible
    When I click the <timeframe> button
    Then there is exactly 1 active timeframe button
    And the <timeframe> button is active

    Examples:
      | timeframe |
      | 1m        |
      | 3m        |
      | 5m        |
      | 15m       |
      | 1h        |
      | 4h        |
      | 1d        |
      | 1w        |
      | 1M        |
