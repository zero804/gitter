import utils
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import WebDriverException
from nose.plugins.attrib import attr
import urllib2
import time
import unittest


class LeftMenuTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)

    def tearDown(self):
        self.driver.quit()

    @attr('unreliable')
    def testLeftMenu(self):

        # login as user 1
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')

        self.preLeftMenuRecents()

        self.showLeftMenu()

        self.postLeftMenuRecents()

        self.leftMenuUnreads()

        self.leftMenuFavourites()

        self.leftMenuSearch()

    def preLeftMenuRecents(self):
        # visit the troupes in a certain order

        if(self.driver.current_url.find("/testtroupe3") == -1):
            self.driver.get(utils.baseUrl("/testtroupe3"))

        time.sleep(0.5)

        if(self.driver.current_url.find("/testtroupe1") == -1):
            self.driver.get(utils.baseUrl("/testtroupe1"))

    def showLeftMenu(self):
        utils.showLeftMenu(self.driver)

        assert(self.driver.find_element_by_css_selector(".trpLeftMenuToolbar").is_displayed())

        time.sleep(1)

    def postLeftMenuRecents(self):
        # ensure that order is reflected in the recents list
        recentList = self.driver.find_element_by_css_selector("#left-menu-list-recent")
        assert(recentList.is_displayed())
        assert(recentList.size >= 2)
        assert(recentList.find_element_by_css_selector('li:nth-child(1)').text.find('Test Troupe 1') == 0)
        assert(recentList.find_element_by_css_selector('li:nth-child(2)').text.find('Test Troupe 3') == 0)

    def leftMenuUnreads(self):
        time.sleep(0.5)

        # ensure the unread header is not visible
        unreadList = self.driver.find_element_by_css_selector("#left-menu-list-unread")
        assert(not unreadList.is_displayed())

    def leftMenuFavourites(self):
        # ensure the favorites header is not visible

        unreadList = self.driver.find_element_by_css_selector("#left-menu-list-favourites")
        assert(not unreadList.is_displayed())

    def leftMenuSearch(self):

        # typing should show the search box if the left menu is open
        self.driver.find_element_by_css_selector('body').click()

        self.driver.find_element_by_css_selector('body').send_keys('te')

        input = self.driver.find_element_by_css_selector('#list-search-input')
        assert(input.is_displayed())

        # search troupes and connected users.
        time.sleep(2)
        results = self.driver.find_element_by_css_selector('#left-menu-list-search ul')
        results.size > 2
