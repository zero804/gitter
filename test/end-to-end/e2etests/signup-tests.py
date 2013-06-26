import utils
import time
import urllib2

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testSignupFromHomePage():
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl("/x"))
    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'
    driver.find_element_by_css_selector('#button-signup').click()
    form = driver.find_element_by_css_selector('#signup-form')
    form.find_element_by_name('email').send_keys(emailAddress)
    form.find_element_by_name('submit').click()
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
    form.find_element_by_name('displayName').send_keys('Willey Waley')
    form.find_element_by_name('password').send_keys('123456')
    form.find_element_by_name('submit').click()

    driver.find_element_by_css_selector('.trpHelpBox')


def testUsernameSelectionUnavailable():
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl("/x"))
    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'
    driver.find_element_by_css_selector('#button-signup').click()
    form = driver.find_element_by_css_selector('#signup-form')
    form.find_element_by_name('email').send_keys(emailAddress)
    form.find_element_by_name('submit').click()
    driver.find_element_by_css_selector('.label-signupsuccess')

    queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    confirmCode = response.read()

    # visit confirm link
    driver.get(utils.baseUrl('/confirm/'+confirmCode))

    # choose a username
    username = 'testuser1'
    inputUser = driver.find_element_by_css_selector('input[name=username]')
    inputUser.send_keys(username)
    driver.find_element_by_css_selector('.not-valid-message').is_displayed()


def testUsernameSelectionAvailable():
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl("/x"))
    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'
    driver.find_element_by_css_selector('#button-signup').click()
    form = driver.find_element_by_css_selector('#signup-form')
    form.find_element_by_name('email').send_keys(emailAddress)
    form.find_element_by_name('submit').click()
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
    driver.find_element_by_css_selector('.valid-message').is_displayed()


def testUsernameSelectionSuggestions():
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl("/x"))
    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'
    driver.find_element_by_css_selector('#button-signup').click()
    form = driver.find_element_by_css_selector('#signup-form')
    form.find_element_by_name('email').send_keys(emailAddress)
    form.find_element_by_name('submit').click()
    driver.find_element_by_css_selector('.label-signupsuccess')

    queryurl = utils.baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    confirmCode = response.read()

    # visit confirm link
    driver.get(utils.baseUrl('/confirm/'+confirmCode))

    # choose a username
    username = 'testuser1'
    inputUser = driver.find_element_by_css_selector('input[name=username]')
    inputUser.send_keys(username)
    driver.find_element_by_css_selector('[data-username="testuser11"]')


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
