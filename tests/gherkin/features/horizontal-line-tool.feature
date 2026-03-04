Feature: Horizontal line drawing tool

  Scenario: Horizontal line button and draw workflow
    Given the Trade Wijs homepage
    When I open the homepage
    Then the horizontal line button is visible
    When I click the horizontal line button
    Then the horizontal line button is active
    When I hover over the chart in horizontal line mode
    Then the horizontal line preview is visible
    When I click the chart to place a horizontal line
    Then a horizontal line is placed
