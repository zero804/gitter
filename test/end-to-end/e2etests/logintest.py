
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
import utils
from nose.plugins.attrib import attr
import unittest

@attr('thread_safe')
class LoginTests(unittest.TestCase):
    _multiprocess_can_split_ = True

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)
        self.username = utils.getJSON('/testdata/newUser').get('username')

    def tearDown(self):
        self.driver.quit()

    def testSignInAndSignout(self):
        utils.existingUserlogin(self.driver, self.username+'@troupetest.local', 'password')
        self.driver.get(utils.baseUrl("/logout"))
        self.driver.find_element_by_css_selector('DIV.trpHomeHeroStripContainer')

    def testSignInWithUsername(self):
        utils.existingUserlogin(self.driver, self.username, 'password')
        self.driver.get(utils.baseUrl("/logout"))
        self.driver.find_element_by_css_selector('DIV.trpHomeHeroStripContainer')

    def testSignInAndNavigateBack(self):
        self.driver.delete_all_cookies()

        utils.existingUserlogin(self.driver, self.username+'@troupetest.local', 'password')

        # Logged in, now attempting to visit /x again
        self.driver.get(utils.baseUrl("/x"))

        # We should navigate back to the last troupe
        WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.ID, 'mini-left-menu')))
