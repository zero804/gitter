import utils
import time
import urllib2
import unittest
import uuid
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from nose.plugins.attrib import attr

@attr('thread_safe')
class ChangePasswordTests(unittest.TestCase):
    _multiprocess_can_split_ = True

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)

        userJSON = utils.getJSON('/testdata/newUser')
        self.username = userJSON.get('username')
        self.userId = userJSON.get('_id')
        self.driver.get(utils.baseUrl("/logout"))

    def testNewUserChangesPasswordAtUserhome(self):
        self.loginFromHomepage(self.username + '@troupetest.local', 'password');
        self.changeProfilePassword('password', 'newpassword')
        self.driver.get(utils.baseUrl("/logout"))
        self.loginFromHomepage(self.username, 'newpassword')

        self.assertUserhomeIsCurrentPage(self.username);

    def testNewUserChangesPasswordAtTroupe(self):
        self.createTroupe();
        self.loginFromHomepage(self.username + '@troupetest.local', 'password');
        self.assertAnyTroupeIsCurrentPage()
        self.changeProfilePassword('password', 'newpassword')
        self.driver.get(utils.baseUrl("/logout"))
        self.loginFromHomepage(self.username, 'newpassword')

        self.assertAnyTroupeIsCurrentPage();

    def testInvitedUserCanSetPasswordAtUserhome(self):
        self.createTroupe()
        self.loginFromHomepage(self.username + '@troupetest.local', 'password');
        self.assertAnyTroupeIsCurrentPage()
        invitee = 'testuser-' + str(uuid.uuid4())
        self.inviteToTroupe(invitee+'@troupetest.local')

        self.driver.get(utils.baseUrl("/logout"))

        acceptInvite(invitee+'@troupetest.local', self.driver)
        self.driver.find_element_by_id('new-user-signup-button').click()
        self.assertAnyTroupeIsCurrentPage();
        self.driver.get(utils.baseUrl("/home"))
        self.assertUserhomeIsCurrentPage('home')
        self.setProfileNameAndPassword('Tester Testerson','password')

        self.driver.get(utils.baseUrl("/logout"))

        self.loginFromHomepage(invitee+'@troupetest.local', 'password')

        self.assertAnyTroupeIsCurrentPage()

    def testInvitedUserCanSetPasswordAtTroupe(self):
        self.createTroupe()
        self.loginFromHomepage(self.username + '@troupetest.local', 'password');
        self.assertAnyTroupeIsCurrentPage()
        invitee = 'testuser-' + str(uuid.uuid4())
        self.inviteToTroupe(invitee+'@troupetest.local')

        self.driver.get(utils.baseUrl("/logout"))

        acceptInvite(invitee+'@troupetest.local', self.driver)
        self.driver.find_element_by_id('new-user-signup-button').click()
        self.assertAnyTroupeIsCurrentPage();
        self.setProfileNameAndPassword('Tester Testerson', 'password')

        self.driver.get(utils.baseUrl("/logout"))

        self.loginFromHomepage(invitee+'@troupetest.local', 'password')

        self.assertAnyTroupeIsCurrentPage()


    def tearDown(self):
        self.driver.quit()

    def loginFromHomepage(self, email, password):
        utils.existingUserlogin(self.driver, email, password)


    def assertUserhomeIsCurrentPage(self, username):
        # wait for page to load
        WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.ID, 'mini-left-menu')))

        current_url = self.driver.current_url
        # IE9 adds a # to the end of the URL, sucks
        if '#' in current_url:
            self.assertEqual(current_url, utils.baseUrl('/'+username)+'#')
        else:
            self.assertEqual(current_url, utils.baseUrl('/'+username))

    def assertAnyTroupeIsCurrentPage(self):
        # wait for page to load
        WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.ID, 'chat-input-textarea')))


    def changeProfilePassword(self, oldPassword, newPassword):
        self.driver.find_element_by_id('profile-icon').click()

        form = self.driver.find_element_by_id('updateprofileform')
        # wait for form to load
        time.sleep(1)
        form.find_element_by_id('password').send_keys(newPassword)
        form.find_element_by_id('oldPassword').send_keys(oldPassword)
        self.driver.find_element_by_css_selector('[data-action=save]').click()

    def setProfileNameAndPassword(self, displayName, newPassword):
        self.driver.find_element_by_id('profile-icon').click()

        self.driver.find_element_by_css_selector('input[name=username]').send_keys('testuser-' + str(uuid.uuid4()))
        self.driver.find_element_by_css_selector('input[name=submit]').click()

        form = self.driver.find_element_by_id('updateprofileform')
        # wait for form to load
        time.sleep(1)
        form.find_element_by_id('displayName').send_keys(displayName)
        form.find_element_by_id('password').send_keys(newPassword)
        self.driver.find_element_by_css_selector('[data-action=save]').click()
        time.sleep(1)

    def createTroupe(self):
        utils.getJSON('/testdata/newTroupeForUser?id='+self.userId)

    def inviteToTroupe(self, email):
        self.driver.get(utils.baseUrl('/#share'))
        WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.ID, 'custom-email')))
        self.driver.find_element_by_id('custom-email').send_keys(email)
        self.driver.find_element_by_id('custom-email-button').click()


def confirmEmailAddress(emailAddress, driver):
    queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    confirmCode = response.read()
    # visit confirm link
    driver.get(utils.baseUrl('/confirm/'+confirmCode))

def acceptInvite(emailAddress, driver):
    queryurl = utils.baseUrl("/testdata/inviteAcceptLink?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    link = response.read()
    # visit confirm link
    driver.get(utils.baseUrl(link))
