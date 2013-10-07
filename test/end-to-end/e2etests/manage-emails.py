import utils
from selenium.webdriver.common.keys import Keys
from nose.plugins.attrib import attr
import time
import unittest

@attr('thread_safe')
class ManageEmailTest(unittest.TestCase):
    _multiprocess_can_split_ = True

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)
        self.username = utils.signup(self.driver)

    def tearDown(self):
        self.driver.quit()

    def addEmail(self, email):
        # start on the manage email dialog
        self.driver.find_element_by_id('addEmailBtn').click()
        time.sleep(0.5)
        utils.send_keys(self.driver.find_element_by_css_selector('[name=email]'), email)
        self.driver.find_element_by_id('saveEmailBtn').click()

    def testAddEmail(self):
        email = 'secondary' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'
        self.driver.find_element_by_id('profile-icon').click()
        self.driver.find_element_by_id('manageEmailsBtn').click()

        self.addEmail(email)

        assert(self.driver.find_element_by_css_selector('#secondaryEmailTable tbody').size >= 2)
        self.driver.find_element_by_id('resendConfirmBtn')

        # confirm
        url = self.driver.current_url
        code = utils.read_url(utils.baseUrl('/testdata/confirmationCodeForSecondary?email=' + email))

        self.driver.get(utils.baseUrl('/confirmSecondary/' + code))

        # make primary
        self.driver.get(url)
        self.driver.find_element_by_id('makePrimaryBtn').click()
        self.driver.find_element_by_css_selector('.trpModalSuccess').is_displayed()

        # delete original
        delBtn = self.driver.find_element_by_id('deleteEmailBtn')
        delBtn.click()
        assert(len(self.driver.find_elements_by_css_selector('tbody tr')) == 1)
