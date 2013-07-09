import utils
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import WebDriverException
import urllib2
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testLeftMenu():

    # login as user 1
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')

    preLeftMenuRecents()

    showLeftMenu()

    postLeftMenuRecents()

    leftMenuUnreads()

    leftMenuFavourites()

    leftMenuSearch()


def preLeftMenuRecents():
    # visit the troupes in a certain order

    if(driver.current_url.find("/testtroupe3") == -1):
        driver.get(utils.baseUrl("/testtroupe3"))

    time.sleep(0.5)

    if(driver.current_url.find("/testtroupe1") == -1):
        driver.get(utils.baseUrl("/testtroupe1"))


def showLeftMenu():
    # show left menu
    action = ActionChains(driver)
    action.move_to_element(driver.find_element_by_css_selector('#left-menu-hotspot'))
    action.click(driver.find_element_by_css_selector('#left-menu-hotspot'))
    action.perform()

    assert(driver.find_element_by_css_selector(".trpLeftMenuToolbar").is_displayed())

    time.sleep(1)


def postLeftMenuRecents():
    # ensure that order is reflected in the recents list
    recentList = driver.find_element_by_css_selector("#left-menu-list-recent")
    assert(recentList.is_displayed())
    assert(recentList.size >= 2)
    assert(recentList.find_element_by_css_selector('li:nth-child(1)').text.find('Test Troupe 1') == 0)
    assert(recentList.find_element_by_css_selector('li:nth-child(2)').text.find('Test Troupe 3') == 0)


def leftMenuUnreads():
    time.sleep(0.5)

    # ensure the unread header is not visible
    unreadList = driver.find_element_by_css_selector("#left-menu-list-unread")
    assert(not unreadList.is_displayed())


def leftMenuFavourites():
    # ensure the favorites header is not visible

    unreadList = driver.find_element_by_css_selector("#left-menu-list-favourites")
    assert(not unreadList.is_displayed())


def leftMenuSearch():

    # typing should show the search box if the left menu is open
    driver.find_element_by_css_selector('body').click()

    driver.find_element_by_css_selector('body').send_keys('te')

    input = driver.find_element_by_css_selector('#list-search-input')
    assert(input.is_displayed())

    # search troupes and connected users.
    time.sleep(2)
    results = driver.find_element_by_css_selector('#left-menu-list-search ul')
    results.size > 2
