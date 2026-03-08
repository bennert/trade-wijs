Feature: Settings persistence after reload

  Scenario Outline: Exchange settings persist after reload
    Given the Trade Wijs homepage
    When I open the homepage
    And I open the settings view
    And I open the exchanges settings category
    And I open the exchange settings tab for binance
    And I toggle one <settingType> setting option
    And I reload the page
    And I open the settings view
    And I open the exchanges settings category
    And I open the exchange settings tab for binance
    Then the <settingType> setting option remains changed after reload

    Examples:
      | settingType |
      | quote       |
      | pair        |
      | timeframe   |

  Scenario Outline: General settings persist after reload
    Given the Trade Wijs homepage
    When I open the homepage
    And I open the settings view
    And I open the general settings category
    And I open the general settings tab for <generalTab>
    And I toggle one <settingType> setting option
    And I reload the page
    And I open the settings view
    And I open the general settings category
    And I open the general settings tab for <generalTab>
    Then the <settingType> setting option remains changed after reload

    Examples:
      | generalTab | settingType |
      | indicators | indicator   |
      | tools      | tool        |
