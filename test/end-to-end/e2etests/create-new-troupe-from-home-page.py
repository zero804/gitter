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

    troupeName = 'Troupe for ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())
    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'

    driver.find_element_by_css_selector('#button-signup').click()
    while True:
        try:
            form = driver.find_element_by_css_selector('#signup-form')
            break
        except WebDriverException as e:
            print(e)
            driver.find_element_by_css_selector('#button-signup').click()

    form.find_element_by_name('troupeName').send_keys(troupeName)
    form.find_element_by_name('email').send_keys(emailAddress)
    form.find_element_by_name('submit').click()

    queryurl = utils.baseUrl("/testdata/confirmationLink?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    confirmLink = response.read()

    driver.get(utils.baseUrl(confirmLink))

    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'

    form = driver.find_element_by_css_selector('#updateprofileform')
    form.find_element_by_name('displayName').send_keys('Willey Waley')
    form.find_element_by_name('password').send_keys('123456')
    form.find_element_by_name('submit').click()

    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 1

    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName


def teardown_module():
    utils.shutdown(driver)
