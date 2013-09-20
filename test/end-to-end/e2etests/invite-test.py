import utils
from selenium.webdriver.common.keys import Keys
from nose.plugins.attrib import attr
import time
import unittest


class InviteTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)
        self.resetData()
        self.login()

    def tearDown(self):
        utils.resetData(self.driver)
        self.driver.quit()

    def resetData(self):
        utils.resetData(self.driver)

    def login(self):
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        time.sleep(0.4)

        if(self.driver.current_url.find("/testtroupe1") == -1):
            self.driver.get(utils.baseUrl("/testtroupe1"))

    def testInvite(self):

        # link = self.driver.find_element_by_css_selector('#people-share-troupe-button')
        # click doesn't work 'would be caught by another element'
        #while(not link.is_displayed()):
        #    time.sleep(0.4)
        #link.click()

        self.driver.get(utils.baseUrl("/testtroupe1#!|share"))

        form = self.driver.find_element_by_id('share-form')

        # type and wait for autocomplete
        inputBox = form.find_element_by_id('custom-email')
        inputBox.send_keys('te')
        time.sleep(1)

        # expect two elements in the suggestions list
        suggestions = form.find_elements_by_css_selector('#invites > div')
        assert len(suggestions) >= 2

        # finish typing in a full email address and send invite
        inputBox.send_keys('stuser+invite-test@troupetest.local')
        inputBox.send_keys(Keys.ENTER)

        time.sleep(0.5)

        # make sure the success element is shown

        # check for the inviteEmail

    @attr('unreliable')
    def testInviteRegisteredUser(self):

        # Login as Test User 1
        self.driver.get(utils.baseUrl("/testtroupe3#!|share"))

        # Invite Test User 2
        form = self.driver.find_element_by_css_selector('form#share-form')
        inputBox = form.find_element_by_name('inviteSearch')
        inputBox.send_keys('testuser2@troupetest.local')
        inputBox.send_keys(Keys.ENTER)
        form.find_element_by_css_selector('button[type=submit]').click()

        # time.sleep(2)

        # Login as Test User 2
        self.driver.get(utils.baseUrl('/signout'))
        utils.existingUserlogin(self.driver, "testuser2@troupetest.local", '123456')

        # time.sleep(3)

        # Navigate to a valid troupe
        self.driver.get(utils.baseUrl("/testtroupe1"))

        # Check that the invite is in the left menu
        inviteLink = self.driver.find_element_by_css_selector("#left-menu-list-invites li:last-child a")
        assert(inviteLink.text.find('Test Troupe 3') >= 0)

        # Navigate to the troupe of invite
        self.driver.get(utils.baseUrl('/testtroupe3'))

        # Check that the invite modal shows
        acceptLink = self.driver.find_element_by_css_selector("#accept-invite")
        rejectLink = self.driver.find_element_by_css_selector("#reject-invite")

        # Click accept
        acceptLink.click()

        time.sleep(1)

        # Check that Test User 2 is accepted into the Test Troupe 2
        headerElement = self.driver.find_element_by_css_selector(".trpHeaderWrapper .trpHeaderTitle")
        assert(headerElement.text.find('Test Troupe 3') >= 0)

        # Check that invite is not in the left menu
        # inviteLink = self.driver.find_element_by_css_selector("#left-menu-list-invites li:last-child a")
        # assert(not inviteLink or inviteLink.text.find('Test Troupe 3') >= 0)

        # Remove self from troupe
        #self.driver.find_element_by_css_selector('.trpSettingsButton').click()
        #self.driver.find_element_by_css_selector('#leave-troupe').click()
        #self.driver.find_element_by_css_selector('#ok').click()
