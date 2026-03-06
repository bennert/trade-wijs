Feature: Settings exchanges controls

  Scenario: Disabling an exchange disables exchange editor controls
    Given the Trade Wijs homepage
    When I open the homepage
    When I open the settings view
    And I open the exchanges settings category
    And I open the exchange settings tab for binance
    And I disable the exchange option for binance
    Then the exchange editor controls are disabled
    When I enable the exchange option for binance
    Then the exchange editor controls are enabled
