
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
import utils
import unittest


class LoginTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)

    def tearDown(self):
        self.driver.quit()

    def testSignInAndSignout(self):
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        self.driver.get(utils.baseUrl("/signout"))
        self.driver.find_element_by_css_selector('DIV.trpHomeHeroStripContainer')

    def testSignInWithUsername(self):
        utils.existingUserlogin(self.driver, 'testuser1', '123456')
        self.driver.get(utils.baseUrl("/signout"))
        self.driver.find_element_by_css_selector('DIV.trpHomeHeroStripContainer')

    def testSignInAndNavigateBack(self):
        self.driver.delete_all_cookies()

        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')

        # Logged in, now attempting to visit /x again
        self.driver.get(utils.baseUrl("/x"))

        # We should navigate back to the last troupe
        WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.ID, 'mini-left-menu')))
