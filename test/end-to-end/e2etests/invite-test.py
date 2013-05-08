import utils
from selenium.webdriver.common.keys import Keys
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def login():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    time.sleep(0.4)

    if(driver.current_url.find("/testtroupe1") == -1):
        driver.get(utils.baseUrl("/testtroupe1"))


def testInvite():
    login()

    link = driver.find_element_by_css_selector('#people-share-troupe-button')
    # click doesn't work 'would be caught by another element'
    #while(not link.is_displayed()):
    #    time.sleep(0.4)
    #link.click()

    driver.get(utils.baseUrl("/testtroupe1#!|share"))

    form = driver.find_element_by_css_selector('form#share-form')

    # type and wait for autocomplete
    inputBox = form.find_element_by_name('inviteSearch')
    inputBox.send_keys('te')
    time.sleep(1)

    # expect two elements in the suggestions list
    suggestions = form.find_elements_by_css_selector('ul.typeahead li')
    assert len(suggestions) >= 2

    # finish typing in a full email address and send invite
    inputBox.send_keys('stuser+invite-test@troupetest.local')
    inputBox.send_keys(Keys.ENTER)
    form.find_element_by_css_selector('button[type=submit]').click()

    time.sleep(0.5)

    # make sure the success element is shown

    # check for the inviteEmail


def teardown_module():
    utils.shutdown(driver)
