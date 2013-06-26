import utils
import time
import urllib2

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testUnathenticatedOnetoOneInviteFlow():
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl("/testuser1"))

    driver.find_element_by_id('new-user').click()

    name = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime())
    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'

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


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
