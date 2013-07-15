
from selenium.webdriver.common.action_chains import ActionChains
import utils
import time
import unittest


class LoginTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)

    def tearDown(self):
        self.driver.quit()

    def testSignInAndSignout(self):
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        self.driver.find_element_by_css_selector('DIV.trpHeaderTitle')
        self.driver.get(utils.baseUrl("/signout"))
        self.driver.find_element_by_css_selector('DIV.trpHomeHeroStripContainer')

    def testSignInWithUsername(self):
        utils.existingUserlogin(self.driver, 'testuser1', '123456')
        self.driver.find_element_by_css_selector('DIV.trpHeaderTitle')
        self.driver.get(utils.baseUrl("/signout"))
        self.driver.find_element_by_css_selector('DIV.trpHomeHeroStripContainer')

    def testSignInAndNavigateBack(self):
        self.driver.delete_all_cookies()

        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        self.driver.find_element_by_css_selector('DIV.trpHeaderTitle')

        # Logged in, now attempting to visit /x again
        self.driver.get(utils.baseUrl("/x"))
        time.sleep(1)

        # We should navigate back to the last troupe
        self.driver.find_element_by_css_selector('DIV.trpHeaderTitle')
