import utils
import urllib2
import time
from selenium.common.exceptions import WebDriverException

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testCreateTroupeForNewUser():
    driver.get(utils.baseUrl("/x"))

    #troupeName = 'Troupe for ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())
    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'

    driver.find_element_by_css_selector('#button-signup').click()
    while True:
        try:
            form = driver.find_element_by_css_selector('#signup-form')
            break
        except WebDriverException as e:
            print(e)
            driver.find_element_by_css_selector('#button-signup').click()

    #form.find_element_by_name('troupeName').send_keys(troupeName)
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

    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 1

    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName


def teardown_module():
    utils.shutdown(driver)
