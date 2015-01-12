import utils
import time
import urllib2
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from nose.plugins.attrib import attr
import unittest


class OneToOneConnectTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)
        utils.resetData(self.driver)

    def tearDown(self):
        self.driver.quit()

    @attr('unreliable')
    def testUnathenticatedOnetoOneInviteFlow(self):
        # logout and visit Test User 1's homepage
        self.driver.get(utils.baseUrl("/logout"))
        self.driver.get(utils.baseUrl("/testuser1"))

        # signup as a new user through the connect modal
        name = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime())
        emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'

        form = self.driver.find_element_by_css_selector('#requestAccess')
        form.find_element_by_name('name').send_keys(name)
        form.find_element_by_name('email').send_keys(emailAddress)
        form.find_element_by_id('unauthenticated-continue').click()
        self.driver.find_element_by_css_selector('.label-signupsuccess')

        queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
        response = urllib2.urlopen(queryurl)
        confirmCode = response.read()

        # visit confirm link
        self.driver.get(utils.baseUrl('/confirm/'+confirmCode))

        # choose a username
        username = 'testuser' + time.strftime("%Y%m%d%H%M%S", time.gmtime())
        inputUser = self.driver.find_element_by_css_selector('input[name=username]')
        inputUser.send_keys(username)
        self.driver.find_element_by_css_selector('#username-form [type=submit]').click()

        # complete profile
        form = self.driver.find_element_by_css_selector('#updateprofileform')
        form.find_element_by_name('password').send_keys('123456')
        self.driver.find_element_by_css_selector('[data-action=save]').click()

        self.driver.find_element_by_css_selector('.trpHelpBox')
        self.driver.find_element_by_css_selector('#cancel-button').click()

        # look for the outgoing invite and resend
        utils.showLeftMenu(self.driver)
        self.driver.find_element_by_id("icon-user").click()
        self.driver.find_element_by_link_text('Test User 1').click()
        self.driver.find_element_by_css_selector('#invite-resend-button').click()
        self.driver.find_element_by_css_selector('.modal-success')

        # TODO: Login as testuser and check invite exists

        self.driver.get(utils.baseUrl("/logout"))
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        utils.showLeftMenu(self.driver)
        self.driver.find_element_by_link_text(name).click()
        self.driver.find_element_by_id('accept-invite').click()

        textArea = self.driver.find_element_by_id('chat-input-textarea')
        textArea.send_keys("hello")
        textArea.send_keys(Keys.RETURN)
        self.driver.find_element_by_css_selector(".trpChatText")


    @attr('unreliable')
    def testAuthenticatedOnetoOneInviteFlow(self):
        # signup as a new user through the landing page
        newUser = utils.signup(self.driver)
        time.sleep(1)

        # visit Test User 1's homepage and send connect invite
        self.driver.get(utils.baseUrl("/testuser1"))
        self.driver.find_element_by_id('submit-button').click()
        self.driver.find_element_by_css_selector('.modal-success').is_displayed()

        # login as Test User 1
        self.driver.get(utils.baseUrl("/logout"))
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')

        # open the left menu and ensure the invite is there
        utils.showLeftMenu(self.driver)
        self.driver.find_element_by_link_text('Willey Waley').click()
        self.driver.find_element_by_id('accept-invite').click()

        textArea = self.driver.find_element_by_id('chat-input-textarea')
        textArea.send_keys("hello")
        textArea.send_keys(Keys.RETURN)
        self.driver.find_element_by_css_selector(".trpChatText")


    @attr('unreliable')
    def testExistingUnauthenticatedOnetoOneInviteFlow(self):
        newUser = utils.signup(self.driver)
        self.driver.get(utils.baseUrl("/logout"))
        self.driver.get(utils.baseUrl("/testuser1"))

        form = self.driver.find_element_by_css_selector('#requestAccess')
        form.find_element_by_name('name').send_keys("Bob")
        form.find_element_by_name('email').send_keys(newUser + '@troupetest.local')
        form.find_element_by_id('unauthenticated-continue').click()
        self.driver.find_element_by_css_selector(".login-content")
        password = self.driver.find_element_by_css_selector('#password')
        password.send_keys('123456')
        self.driver.find_element_by_css_selector('#signin-button').click()
        self.driver.find_element_by_id("request-form")
