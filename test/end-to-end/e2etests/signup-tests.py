import utils
import urllib2
import unittest
import uuid
import time
from nose.plugins.attrib import attr
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class SignupTests(unittest.TestCase):
    _multiprocess_can_split_ = True

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)
        self.existingUsername = utils.getJSON('/testdata/newUser').get('username')

    @attr('thread_safe')
    def testUsernameSelectionUnavailable(self):
        self.driver.get(utils.baseUrl("/logout"))
        emailAddress = generateUniqueEmailAddress()
        self.driver.find_element_by_css_selector('#button-signup').click()
        form = self.driver.find_element_by_css_selector('#signup-form')
        form.find_element_by_name('email').send_keys(emailAddress)
        form.find_element_by_name('submit').click()
        self.driver.find_element_by_css_selector('.label-signupsuccess')

        confirmEmailAddress(emailAddress, self.driver)

        # choose a username
        inputUser = self.driver.find_element_by_css_selector('input[name=username]')
        inputUser.send_keys(self.existingUsername)
        errorMessage = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.CLASS_NAME, 'not-valid-message')))

        assert errorMessage.is_displayed()

    @attr('thread_safe')
    def testUsernameSelectionAvailable(self):
        self.driver.get(utils.baseUrl("/logout"))
        emailAddress = generateUniqueEmailAddress()
        self.driver.find_element_by_css_selector('#button-signup').click()
        form = self.driver.find_element_by_css_selector('#signup-form')
        form.find_element_by_name('email').send_keys(emailAddress)
        form.find_element_by_name('submit').click()
        self.driver.find_element_by_css_selector('.label-signupsuccess')

        confirmEmailAddress(emailAddress, self.driver)

        # choose a username
        username = 'testuser-' + str(uuid.uuid4())
        inputUser = self.driver.find_element_by_css_selector('input[name=username]')
        inputUser.send_keys(username)
        validMessage = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.CLASS_NAME, 'valid-message')))

        assert validMessage.is_displayed()

    @attr('thread_safe')
    def testUsernameSelectionSuggestions(self):
        self.driver.get(utils.baseUrl("/logout"))
        emailAddress = generateUniqueEmailAddress()
        self.driver.find_element_by_css_selector('#button-signup').click()
        form = self.driver.find_element_by_css_selector('#signup-form')
        form.find_element_by_name('email').send_keys(emailAddress)
        form.find_element_by_name('submit').click()
        self.driver.find_element_by_css_selector('.label-signupsuccess')

        confirmEmailAddress(emailAddress, self.driver)

        # choose a username
        inputUser = self.driver.find_element_by_css_selector('input[name=username]')
        inputUser.send_keys(self.existingUsername)
        suggestion = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-username="'+self.existingUsername+'1"]')))

        assert suggestion.is_displayed()

    @attr('thread_safe')
    @attr('phone_compatible')
    def testSignupFromHomePage(self):
        self.driver.get(utils.baseUrl("/logout"))
        emailAddress = generateUniqueEmailAddress()
        self.driver.find_element_by_css_selector('#button-signup').click()

        form = self.driver.find_element_by_css_selector('#signup-form')
        WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.ID, 'email'))).send_keys(emailAddress)
        form.find_element_by_name('submit').click()
        self.driver.find_element_by_css_selector('.label-signupsuccess')

        queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
        response = urllib2.urlopen(queryurl)
        confirmCode = response.read()

        # visit confirm link
        self.driver.get(utils.baseUrl('/confirm/'+confirmCode))
        self.completeSignup()

        self.assertAnyTroupeIsCurrentPage()

    def testGoogleSignup(self):
        # Clean database
        utils.resetData(self.driver)

        email   = 'mister.troupe@gmail.com'
        passwd  = 'Eeboh7othaefitho'
        name    = 'Mr Troupe'

        # Sing in into Gmail
        self.driver.get("https://accounts.google.com/ServiceLogin?service=mail&continue=https://mail.google.com/mail/&hl=en")
        form = self.driver.find_element_by_css_selector('#gaia_loginform')
        form.find_element_by_name('Email').send_keys(email)
        form.find_element_by_name('Passwd').send_keys(passwd)
        form.find_element_by_name('signIn').click()

        # Revoke access
        self.driver.get("https://accounts.google.com/b/0/IssuedAuthSubTokens?hl=en_GB")
        form = self.driver.find_element_by_name('Troupe')
        form.find_element_by_css_selector('input[type=submit]').click()

        # Trigger Sign Up
        self.driver.get(utils.baseUrl("/x"))
        self.driver.find_element_by_id('google-signup').click()

        # Accept oAuth permissions
        accept = WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable((By.ID, 'submit_approve_access')))
        accept.click()

        displayName = self.driver.find_element_by_name('displayName').get_attribute('value')
        self.assertEqual(displayName, name)

        self.completeSignupWithoutDisplayName()

        self.assertAnyTroupeIsCurrentPage()


    def tearDown(self):
        self.driver.quit()

    def assertUserhomeIsCurrentPage(self, username):
        # wait for page to load
        WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.ID, 'welcomeBox')))

        current_url = self.driver.current_url
        # IE9 adds a # to the end of the URL, sucks
        if '#' in current_url:
            self.assertEqual(current_url, utils.baseUrl('/'+username)+'#')
        else:
            self.assertEqual(current_url, utils.baseUrl('/'+username))

    def assertAnyTroupeIsCurrentPage(self):
        # wait for page to load
        WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.ID, 'chat-input-textarea')))

    def completeSignup(self):
        self.driver.find_element_by_css_selector('input[name=displayName]').send_keys('Tester Testerson')
        self.completeSignupWithoutDisplayName()

    def completeSignupWithoutDisplayName(self):
        self.driver.find_element_by_css_selector('input[name=username]').send_keys('testuser-' + str(uuid.uuid4()))
        self.driver.find_element_by_css_selector('input[name=password]').send_keys('password')
        self.driver.find_element_by_id('next-button').click()

        self.driver.find_element_by_id('troupeName').send_keys('Project Zeus')
        self.driver.find_element_by_id('next-button').click()

        self.driver.find_element_by_id('custom-email').send_keys('testuser-' + str(uuid.uuid4()) + '@troupetest.local')
        self.driver.find_element_by_id('custom-email-button').click()
        time.sleep(1)
        self.driver.find_element_by_id('next-button').click()

        self.driver.find_element_by_tag_name('a').click()

        self.driver.find_element_by_tag_name('a').click()


def generateUniqueEmailAddress():
    return 'testuser-' + str(uuid.uuid4()) + '@troupetest.local'


def confirmEmailAddress(emailAddress, driver):
    queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    confirmCode = response.read()
    # visit confirm link
    driver.get(utils.baseUrl('/confirm/'+confirmCode))
