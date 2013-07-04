import utils
import time
import urllib2
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

driver = None


def setup_module():
    global driver
    driver = utils.driver()
    utils.resetData(driver)


def testUnathenticatedOnetoOneInviteFlow():
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl("/testuser1"))

    name = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime())
    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'

    form = driver.find_element_by_css_selector('#requestAccess')
    form.find_element_by_name('name').send_keys(name)
    form.find_element_by_name('email').send_keys(emailAddress)
    form.find_element_by_id('unauthenticated-continue').click()
    driver.find_element_by_css_selector('.label-signupsuccess')

    queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    confirmCode = response.read()

    # visit confirm link
    driver.get(utils.baseUrl('/confirm/'+confirmCode))

    # choose a username
    username = 'testuser' + time.strftime("%Y%m%d%H%M%S", time.gmtime())
    inputUser = driver.find_element_by_css_selector('input[name=username]')
    inputUser.send_keys(username)
    driver.find_element_by_css_selector('#username-form [type=submit]').click()
    assert(driver.current_url == utils.baseUrl('/'+username))

    # complete profile
    form = driver.find_element_by_css_selector('#updateprofileform')
    form.find_element_by_name('password').send_keys('123456')
    form.find_element_by_name('submit').click()

    driver.find_element_by_css_selector('.trpHelpBox')

    # TODO: Login as testuser and check invite exists

    driver.get(utils.baseUrl("/signout"))
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    actionChain = ActionChains(driver)
    actionChain.move_to_element(driver.find_element_by_id('left-menu-hotspot'))
    actionChain.perform()
    driver.find_element_by_link_text(name).click()
    driver.find_element_by_id('accept-invite').click()

    textArea = driver.find_element_by_id('chat-input-textarea')
    textArea.send_keys("hello")
    textArea.send_keys(Keys.RETURN)
    driver.find_element_by_css_selector(".trpChatText")


def testAuthenticatedOnetoOneInviteFlow():
    newUser = utils.signup(driver)
    time.sleep(1)
    driver.get(utils.baseUrl("/testuser1"))
    driver.find_element_by_id('submit-button').click()
    driver.find_element_by_css_selector('.modal-success').is_displayed()

    driver.get(utils.baseUrl("/signout"))
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    actionChain = ActionChains(driver)
    actionChain.move_to_element(driver.find_element_by_id('left-menu-hotspot'))
    actionChain.perform()
    driver.find_element_by_link_text('Willey Waley').click()
    driver.find_element_by_id('accept-invite').click()

    textArea = driver.find_element_by_id('chat-input-textarea')
    textArea.send_keys("hello")
    textArea.send_keys(Keys.RETURN)
    driver.find_element_by_css_selector(".trpChatText")


def testExistingUnauthenticatedOnetoOneInviteFlow():
    newUser = utils.signup(driver)
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl("/testuser1"))

    form = driver.find_element_by_css_selector('#requestAccess')
    form.find_element_by_name('name').send_keys("Bob")
    form.find_element_by_name('email').send_keys(newUser + '@troupetest.local')
    form.find_element_by_id('unauthenticated-continue').click()
    driver.find_element_by_css_selector(".login-content")
    password = driver.find_element_by_css_selector('#password')
    password.send_keys('123456')
    driver.find_element_by_css_selector('#signin-button').click()
    driver.find_element_by_id("request-form")


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
