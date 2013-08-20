import utils
import time
import urllib2
import unittest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class SignupTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)

    def testUsernameSelectionUnavailable(self):
        self.driver.get(utils.baseUrl("/signout"))
        self.driver.get(utils.baseUrl("/x"))
        emailAddress = generateUniqueEmailAddress()
        self.driver.find_element_by_css_selector('#button-signup').click()
        form = self.driver.find_element_by_css_selector('#signup-form')
        form.find_element_by_name('email').send_keys(emailAddress)
        form.find_element_by_name('submit').click()
        self.driver.find_element_by_css_selector('.label-signupsuccess')

        confirmEmailAddress(emailAddress, self.driver)

        # choose a username
        username = 'testuser1'
        inputUser = self.driver.find_element_by_css_selector('input[name=username]')
        inputUser.send_keys(username)
        errorMessage = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.CLASS_NAME, 'not-valid-message')))

        assert errorMessage.is_displayed()

    def testUsernameSelectionAvailable(self):
        self.driver.get(utils.baseUrl("/signout"))
        self.driver.get(utils.baseUrl("/x"))
        emailAddress = generateUniqueEmailAddress()
        self.driver.find_element_by_css_selector('#button-signup').click()
        form = self.driver.find_element_by_css_selector('#signup-form')
        form.find_element_by_name('email').send_keys(emailAddress)
        form.find_element_by_name('submit').click()
        self.driver.find_element_by_css_selector('.label-signupsuccess')

        confirmEmailAddress(emailAddress, self.driver)

        # choose a username
        username = 'testuser' + time.strftime("%Y%m%d%H%M%S", time.gmtime())
        inputUser = self.driver.find_element_by_css_selector('input[name=username]')
        inputUser.send_keys(username)
        validMessage = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.CLASS_NAME, 'valid-message')))

        assert validMessage.is_displayed()

    def testUsernameSelectionSuggestions(self):
        self.driver.get(utils.baseUrl("/signout"))
        self.driver.get(utils.baseUrl("/x"))
        emailAddress = generateUniqueEmailAddress()
        self.driver.find_element_by_css_selector('#button-signup').click()
        form = self.driver.find_element_by_css_selector('#signup-form')
        form.find_element_by_name('email').send_keys(emailAddress)
        form.find_element_by_name('submit').click()
        self.driver.find_element_by_css_selector('.label-signupsuccess')

        confirmEmailAddress(emailAddress, self.driver)

        # choose a username
        username = 'testuser1'
        inputUser = self.driver.find_element_by_css_selector('input[name=username]')
        inputUser.send_keys(username)
        suggestion = WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-username="testuser11"]')))

        assert suggestion.is_displayed()

    def testSignupFromHomePage(self):
        self.driver.get(utils.baseUrl("/signout"))
        self.driver.get(utils.baseUrl("/x"))
        emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'
        self.driver.find_element_by_css_selector('#button-signup').click()
        form = self.driver.find_element_by_css_selector('#signup-form')
        form.find_element_by_name('email').send_keys(emailAddress)
        form.find_element_by_name('submit').click()
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

        self.driver.find_element_by_id('displayName').send_keys('Test Testerson')
        self.driver.find_element_by_id('password').send_keys('password')
        self.driver.find_element_by_css_selector('#updateprofileform [type=submit]').click()


        self.assertEqual(self.driver.current_url, utils.baseUrl('/'+username))

    def tearDown(self):
        self.driver.quit()


def generateUniqueEmailAddress():
    return 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'


def confirmEmailAddress(emailAddress, driver):
    queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    confirmCode = response.read()
    # visit confirm link
    driver.get(utils.baseUrl('/confirm/'+confirmCode))
