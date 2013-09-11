import utils
from selenium.webdriver.common.keys import Keys
from nose.plugins.attrib import attr
import time
import unittest


class ManageEmailTest(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)
        self.resetData()
        self.username = utils.signup(self.driver)

    def tearDown(self):
        self.resetData()
        self.driver.quit()

    def resetData(self):
        utils.resetData(self.driver)

    def addEmail(self, email):
        # start on the manage email dialog
        self.driver.find_element_by_id('addEmailBtn').click()
        utils.send_keys(self.driver.find_element_by_css_selector('[name=email]'), email)
        self.driver.find_element_by_id('saveEmailBtn').click()

    def testAddEmail(self):
        email = 'secondary' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'
        self.driver.find_element_by_id('link-profile').click()
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
