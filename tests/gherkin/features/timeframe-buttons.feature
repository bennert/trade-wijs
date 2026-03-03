Feature: Timeframe buttons on the homepage

  Scenario: Timeframe buttons are shown on the homepage
    Given the Trade Wijs homepage
    When I open the homepage
    Then the page title is visible
    And the timeframe buttons block is visible
    And there are 9 timeframe buttons
    And there is exactly 1 active timeframe button
    And the 1m button is visible
    And the 1M button is visible
