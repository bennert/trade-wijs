Feature: Settings persistence after reload

  Scenario: Quote currency setting persists after reload
    Given the Trade Wijs homepage
    When I open the homepage
    And I open the settings view
    And I open the exchanges settings category
    And I open the exchange settings tab for binance
    And I toggle one quote setting option
    And I reload the page
    And I open the settings view
    And I open the exchanges settings category
    And I open the exchange settings tab for binance
    Then the quote setting option remains changed after reload

  Scenario: Pair setting persists after reload
    Given the Trade Wijs homepage
    When I open the homepage
    And I open the settings view
    And I open the exchanges settings category
    And I open the exchange settings tab for binance
    And I toggle one pair setting option
    And I reload the page
    And I open the settings view
    And I open the exchanges settings category
    And I open the exchange settings tab for binance
    Then the pair setting option remains changed after reload

  Scenario: Timeframe setting persists after reload
    Given the Trade Wijs homepage
    When I open the homepage
    And I open the settings view
    And I open the exchanges settings category
    And I open the exchange settings tab for binance
    And I toggle one timeframe setting option
    And I reload the page
    And I open the settings view
    And I open the exchanges settings category
    And I open the exchange settings tab for binance
    Then the timeframe setting option remains changed after reload

  Scenario: Indicator setting persists after reload
    Given the Trade Wijs homepage
    When I open the homepage
    And I open the settings view
    And I open the general settings category
    And I open the general settings tab for indicators
    And I toggle one indicator setting option
    And I reload the page
    And I open the settings view
    And I open the general settings category
    And I open the general settings tab for indicators
    Then the indicator setting option remains changed after reload

  Scenario: Tool setting persists after reload
    Given the Trade Wijs homepage
    When I open the homepage
    And I open the settings view
    And I open the general settings category
    And I open the general settings tab for tools
    And I toggle one tool setting option
    And I reload the page
    And I open the settings view
    And I open the general settings category
    And I open the general settings tab for tools
    Then the tool setting option remains changed after reload
