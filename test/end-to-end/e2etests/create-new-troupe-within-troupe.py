import utils
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import WebDriverException
import urllib2
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testCreateTroupeFromGroupTroupe():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')

    if(driver.current_url.find("/testtroupe1") == -1):
        driver.get(utils.baseUrl("/testtroupe1"))

    while True:
        actionChain = ActionChains(driver)
        actionChain.move_to_element(driver.find_element_by_css_selector('#menu-toggle'))
        actionChain.perform()

        try:
            driver.find_element_by_css_selector('#icon-troupes').click()
        except WebDriverException as e:
            print(e)
            print("Click failed, retrying: ")

            actionChain = ActionChains(driver)
            actionChain.move_to_element(driver.find_element_by_css_selector('DIV.trpHeaderTitle'))
            actionChain.perform()

            time.sleep(0.5)
            continue
        break

    driver.find_element_by_css_selector('a div.trpNewTroupeButton').click()

    troupeName = 'Troupe for ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())

    form = driver.find_element_by_css_selector('form#signup-form')
    inputBox = form.find_element_by_css_selector('input#troupeName')
    inputBox.send_keys(troupeName)
    driver.find_element_by_name('submit').click()
    time.sleep(1)

    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName

    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'

    form = driver.find_element_by_css_selector('#share-form')
    form.find_element_by_css_selector('#displayName').send_keys('test user')
    form.find_element_by_css_selector('#inviteEmail').send_keys(emailAddress)
    form.find_element_by_css_selector('#submit-button').click()

    success = driver.find_element_by_css_selector('div.modal-success.view')
    assert success.is_displayed()

    time.sleep(1)

    queryurl = utils.baseUrl("/testdata/inviteAcceptLink?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    acceptLink = response.read()

    driver.delete_all_cookies()
    driver.get(utils.baseUrl(acceptLink))

    form = driver.find_element_by_css_selector('#updateprofileform')
    assert form.find_element_by_css_selector('#displayName').get_attribute('value') == 'test user'
    form.find_element_by_css_selector('#password').send_keys('123456')

    form.find_element_by_name('submit').click()

    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName

    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 2


def testCreateTroupeFromOneToOneTroupe():
    driver.delete_all_cookies()
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')

    queryurl = utils.baseUrl("/testdata/oneToOneLink?email=testuser2@troupetest.local")
    response = urllib2.urlopen(queryurl)
    oneToOneLink = response.read()

    driver.get(utils.baseUrl(oneToOneLink))

    driver.find_element_by_css_selector('#people-create-troupe-button').click()

    troupeName = 'Troupe for ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())
    emailAddress = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'

    form = driver.find_element_by_css_selector('#signup-form')
    form.find_element_by_css_selector('#troupeName').send_keys(troupeName)
    form.find_element_by_css_selector('#displayName').send_keys('Piet Pompies')
    form.find_element_by_css_selector('#inviteEmail').send_keys(emailAddress)

    form.find_element_by_name('submit').click()

    time.sleep(0.5)

    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName

    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 2

    queryurl = utils.baseUrl("/testdata/inviteAcceptLink?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    acceptLink = response.read()

    driver.delete_all_cookies()
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl(acceptLink))

    form = driver.find_element_by_css_selector('#updateprofileform')
    assert form.find_element_by_css_selector('#displayName').get_attribute('value') == 'Piet Pompies'
    form.find_element_by_css_selector('#password').send_keys('123456')

    form.find_element_by_name('submit').click()

    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 3

    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName


def teardown_module():
    utils.shutdown(driver)
