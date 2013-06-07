import utils
from selenium.webdriver.common.keys import Keys
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()

    resetData()
    login()


def resetData():
    utils.resetData(driver)


def login():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    time.sleep(0.4)

    if(driver.current_url.find("/testtroupe1") == -1):
        driver.get(utils.baseUrl("/testtroupe1"))


def testInvite():

    # link = driver.find_element_by_css_selector('#people-share-troupe-button')
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


def testInviteRegisteredUser():

    # Login as Test User 1
    driver.get(utils.baseUrl("/testtroupe3#!|share"))

    # Invite Test User 2
    form = driver.find_element_by_css_selector('form#share-form')
    inputBox = form.find_element_by_name('inviteSearch')
    inputBox.send_keys('testuser2@troupetest.local')
    inputBox.send_keys(Keys.ENTER)
    form.find_element_by_css_selector('button[type=submit]').click()

    # time.sleep(2)

    # Login as Test User 2
    driver.get(utils.baseUrl('/signout'))
    utils.existingUserlogin(driver, "testuser2@troupetest.local", '123456')

    # time.sleep(3)

    # Navigate to a valid troupe
    driver.get(utils.baseUrl("/testtroupe1"))

    # Check that the invite is in the left menu
    inviteLink = driver.find_element_by_css_selector("#left-menu-list-invites li:last-child a")
    assert(inviteLink.text.find('Test Troupe 3') >= 0)

    # Navigate to the troupe of invite
    driver.get(utils.baseUrl('/testtroupe3'))

    # Check that the invite modal shows
    acceptLink = driver.find_element_by_css_selector("#accept-invite")
    rejectLink = driver.find_element_by_css_selector("#reject-invite")

    # Click accept
    acceptLink.click()

    time.sleep(1)

    # Check that Test User 2 is accepted into the Test Troupe 2
    headerElement = driver.find_element_by_css_selector(".trpHeaderWrapper .trpHeaderTitle")
    assert(headerElement.text.find('Test Troupe 3') >= 0)

    # Check that invite is not in the left menu
    # inviteLink = driver.find_element_by_css_selector("#left-menu-list-invites li:last-child a")
    # assert(not inviteLink or inviteLink.text.find('Test Troupe 3') >= 0)

    # Remove self from troupe
    #driver.find_element_by_css_selector('.trpSettingsButton').click()
    #driver.find_element_by_css_selector('#leave-troupe').click()
    #driver.find_element_by_css_selector('#ok').click()


def teardown_module():
    utils.shutdown(driver)
