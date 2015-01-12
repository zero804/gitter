import utils
import time
import urllib2
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from nose.plugins.attrib import attr
import unittest


class RequestAccessTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)
        utils.resetData(self.driver)

    def tearDown(self):
        self.driver.quit()

    @attr('unreliable')
    def testNewUserUnauthenticatedTroupeRequest(self):
        self.driver.get(utils.baseUrl("/logout"))
        self.driver.get(utils.baseUrl("/testtroupe3"))
        thisTime = time.strftime("%Y%m%d%H%M%S", time.gmtime())

        self.driver.find_element_by_id("new-user").click()

        name = 'testuser.' + thisTime
        emailAddress = 'testuser.' + thisTime + '@troupetest.local'

        form = self.driver.find_element_by_css_selector('#requestAccess')
        form.find_element_by_name('name').send_keys(name)
        form.find_element_by_name('email').send_keys(emailAddress)
        form.find_element_by_id('submit-button').click()
        self.driver.find_element_by_css_selector('.label-signupsuccess')

        queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
        response = urllib2.urlopen(queryurl)
        confirmCode = response.read()

        # visit confirm link
        self.driver.get(utils.baseUrl('/confirm/'+confirmCode))

        # choose a username
        username = 'testuser' + thisTime
        inputUser = self.driver.find_element_by_css_selector('input[name=username]')
        inputUser.send_keys(username)
        self.driver.find_element_by_css_selector('#username-form [type=submit]').click()

        # complete profile
        form = self.driver.find_element_by_css_selector('#updateprofileform')
        form.find_element_by_name('password').send_keys('123456')
        self.driver.find_element_by_css_selector('[data-action=save]').click()

        self.driver.find_element_by_css_selector('.trpHelpBox')

        # TODO: Login as testuser and check invite exists

        self.driver.get(utils.baseUrl("/logout"))
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        self.driver.get(utils.baseUrl("/testtroupe3"))
        time.sleep(1)
        self.driver.find_element_by_css_selector(".frame-request .trpPeopleListItem").click()
        time.sleep(1)
        self.driver.find_element_by_id('request-accept-button').click()

    @attr('unreliable')
    def testExistingUnauthenticatedRequest(self):
        self.driver.get(utils.baseUrl("/logout"))
        self.driver.get(utils.baseUrl("/testtroupe3"))
        name = self.driver.find_element_by_css_selector('#email')
        name.clear()
        name.send_keys("testuser2")
        password = self.driver.find_element_by_css_selector('#password')
        password.send_keys("123456")
        self.driver.find_element_by_css_selector('#signin-button').click()
        form = self.driver.find_element_by_css_selector('#requestAccess')
        self.driver.find_element_by_id('submit-button').click()

        self.driver.get(utils.baseUrl("/logout"))
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        self.driver.get(utils.baseUrl("/testtroupe3"))
        time.sleep(1)
        self.driver.find_element_by_css_selector(".frame-request .trpPeopleListItem").click()
        time.sleep(1)
        self.driver.find_element_by_id('request-reject-button').click()
        time.sleep(1)
        self.driver.find_element_by_css_selector('[data-action=yes]').click()

    @attr('unreliable')
    def testExistingAuthenticatedRequest(self):
        self.driver.get(utils.baseUrl("/logout"))
        utils.existingUserlogin(self.driver, 'testuser2@troupetest.local', '123456')
        self.driver.get(utils.baseUrl("/testtroupe3"))
        form = self.driver.find_element_by_css_selector('#requestAccess')
        self.driver.find_element_by_id('submit-button').click()

        self.driver.get(utils.baseUrl("/logout"))
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        self.driver.get(utils.baseUrl("/testtroupe3"))
        time.sleep(1)
        self.driver.find_element_by_css_selector(".frame-request .trpPeopleListItem").click()
        time.sleep(1)
        self.driver.find_element_by_id('request-reject-button').click()
        time.sleep(1)
        self.driver.find_element_by_css_selector('[data-action=yes]').click()
