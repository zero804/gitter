
import utils
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testSignin():
    driver.delete_all_cookies()
    driver.get(utils.baseUrl("/oauth/authorize?client_id=1&redirect_uri=http%3A%2F%2Ftrou.pe%2FOAuthCallback&response_type=code&scope=read"))

    driver.find_element_by_css_selector('#email').send_keys('testuser@troupetest.local')
    driver.find_element_by_css_selector('#password').send_keys('123456')
    url = driver.current_url
    driver.find_element_by_css_selector('#submit').click()

    while driver.current_url == url:
        time.sleep(0.1)

    assert("/OAuthCallback" in driver.current_url)

    driver.get(utils.baseUrl("/signout"))


def testSigninWithoutCookies():
    driver.delete_all_cookies()
    driver.get(utils.baseUrl("/oauth/authorize?client_id=1&redirect_uri=http%3A%2F%2Ftrou.pe%2FOAuthCallback&response_type=code&scope=read"))
    driver.delete_all_cookies()

    driver.find_element_by_css_selector('#email').send_keys('testuser@troupetest.local')
    driver.find_element_by_css_selector('#password').send_keys('123456')

    url = driver.current_url
    driver.find_element_by_css_selector('#submit').click()

    while driver.current_url == url:
        time.sleep(0.1)

    assert("/OAuthCallback" in driver.current_url)


def teardown_module():
    driver.quit()
