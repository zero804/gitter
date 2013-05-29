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

    leftMenuRecents()

    leftMenuUnreads()

    leftMenuFavourites()


def leftMenuRecents():
    # visit the troupes in a certain order

    if(driver.current_url.find("/testtroupe3") == -1):
        driver.get(utils.baseUrl("/testtroupe3"))

    time.sleep(0.5)

    if(driver.current_url.find("/testtroupe1") == -1):
        driver.get(utils.baseUrl("/testtroupe1"))

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
