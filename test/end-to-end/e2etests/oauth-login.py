
import utils
import time
from nose.plugins.attrib import attr
import unittest


class OauthLoginTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)

    def tearDown(self):
        self.driver.quit()

    @attr('unreliable')
    def testSignin(self):
        self.driver.delete_all_cookies()
        self.driver.get(utils.baseUrl("/oauth/authorize?client_id=1&redirect_uri=http%3A%2F%2Ftrou.pe%2FOAuthCallback&response_type=code&scope=read"))

        self.driver.find_element_by_css_selector('#email').send_keys('testuser@troupetest.local')
        self.driver.find_element_by_css_selector('#password').send_keys('123456')
        url = self.driver.current_url
        self.driver.find_element_by_css_selector('#submit').click()

        while self.driver.current_url == url:
            time.sleep(0.1)

        assert("/OAuthCallback" in self.driver.current_url)

        self.driver.get(utils.baseUrl("/logout"))

    @attr('unreliable')
    def testSigninWithoutCookies(self):
        self.driver.delete_all_cookies()
        self.driver.get(utils.baseUrl("/oauth/authorize?client_id=1&redirect_uri=http%3A%2F%2Ftrou.pe%2FOAuthCallback&response_type=code&scope=read"))
        self.driver.delete_all_cookies()

        self.driver.find_element_by_css_selector('#email').send_keys('testuser@troupetest.local')
        self.driver.find_element_by_css_selector('#password').send_keys('123456')

        url = self.driver.current_url
        self.driver.find_element_by_css_selector('#submit').click()

        while self.driver.current_url == url:
            time.sleep(0.1)

        assert("/OAuthCallback" in self.driver.current_url)
