import utils
import time
import urllib2
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from nose.plugins.attrib import attr

driver = None


def setup_module():
    global driver
    driver = utils.driver()
    utils.resetData(driver)


@attr('unreliable')
def testNewUserUnauthenticatedTroupeRequest():
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl("/testtroupe3"))
    thisTime = time.strftime("%Y%m%d%H%M%S", time.gmtime())

    driver.find_element_by_id("new-user").click()

    name = 'testuser.' + thisTime
    emailAddress = 'testuser.' + thisTime + '@troupetest.local'

    form = driver.find_element_by_css_selector('#requestAccess')
    form.find_element_by_name('name').send_keys(name)
    form.find_element_by_name('email').send_keys(emailAddress)
    form.find_element_by_id('submit-button').click()
    driver.find_element_by_css_selector('.label-signupsuccess')

    queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    confirmCode = response.read()

    # visit confirm link
    driver.get(utils.baseUrl('/confirm/'+confirmCode))

    # choose a username
    username = 'testuser' + thisTime
    inputUser = driver.find_element_by_css_selector('input[name=username]')
    inputUser.send_keys(username)
    driver.find_element_by_css_selector('#username-form [type=submit]').click()

    # complete profile
    form = driver.find_element_by_css_selector('#updateprofileform')
    form.find_element_by_name('password').send_keys('123456')
    form.find_element_by_name('submit').click()

    driver.find_element_by_css_selector('.trpHelpBox')

    # TODO: Login as testuser and check invite exists

    driver.get(utils.baseUrl("/signout"))
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    driver.get(utils.baseUrl("/testtroupe3"))
    time.sleep(1)
    driver.find_element_by_css_selector(".frame-request .trpPeopleListItem").click()
    time.sleep(1)
    driver.find_element_by_id('request-accept-button').click()


@attr('unreliable')
def testExistingUnauthenticatedRequest():
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl("/testtroupe3"))
    name = driver.find_element_by_css_selector('#email')
    name.clear()
    name.send_keys("testuser2")
    password = driver.find_element_by_css_selector('#password')
    password.send_keys("123456")
    driver.find_element_by_css_selector('#signin-button').click()
    form = driver.find_element_by_css_selector('#requestAccess')
    driver.find_element_by_id('submit-button').click()

    driver.get(utils.baseUrl("/signout"))
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    driver.get(utils.baseUrl("/testtroupe3"))
    time.sleep(1)
    driver.find_element_by_css_selector(".frame-request .trpPeopleListItem").click()
    time.sleep(1)
    driver.find_element_by_id('request-reject-button').click()
    time.sleep(1)
    driver.find_element_by_id('yes').click()


@attr('unreliable')
def testExistingAuthenticatedRequest():
    driver.get(utils.baseUrl("/signout"))
    utils.existingUserlogin(driver, 'testuser2@troupetest.local', '123456')
    driver.get(utils.baseUrl("/testtroupe3"))
    form = driver.find_element_by_css_selector('#requestAccess')
    driver.find_element_by_id('submit-button').click()

    driver.get(utils.baseUrl("/signout"))
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    driver.get(utils.baseUrl("/testtroupe3"))
    time.sleep(1)
    driver.find_element_by_css_selector(".frame-request .trpPeopleListItem").click()
    time.sleep(1)
    driver.find_element_by_id('request-reject-button').click()
    time.sleep(1)
    driver.find_element_by_id('yes').click()


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
