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

  Scenario Outline: Refresh status shows updating during manual selector changes
    Given the Trade Wijs homepage
    When I open the homepage
    Then the refresh status shows Live
    When I trigger a manual market refresh via <selector>
    Then the refresh status transitions through Updating to Live

    Examples:
      | selector |
      | timeframe |
      | pair      |
      | exchange  |

  Scenario: Right info panel can be collapsed and expanded
    Given the Trade Wijs homepage
    When I open the homepage
    Then the market info panel is expanded
    When I toggle the market info panel
    Then the market info panel is collapsed
    When I toggle the market info panel
    Then the market info panel is expanded
