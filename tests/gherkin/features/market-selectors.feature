Feature: Market selector buttons

  Scenario: Exchange selector button opens menu and changes selected exchange
    Given the Trade Wijs homepage
    When I open the homepage
    Then the exchange selector button is visible
    When I open the exchange selector menu
    Then the exchange selector menu is visible
    When I select a different exchange option
    Then the exchange selector button reflects the selected exchange
    And there is exactly 1 active exchange option

  Scenario: Pair selector button opens menu and changes selected pair
    Given the Trade Wijs homepage
    When I open the homepage
    Then the pair selector button is visible
    When I open the pair selector menu
    Then the pair selector menu is visible
    When I select a different pair option
    Then the pair selector button reflects the selected pair
    And there is exactly 1 active pair option
