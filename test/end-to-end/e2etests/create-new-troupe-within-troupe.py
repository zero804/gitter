import utils
from selenium.webdriver.common.keys import Keys
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

    driver.execute_script('$("a div.trpNewTroupeButton").click()')
    #startTroupeButton = driver.find_element_by_css_selector('a div.trpNewTroupeButton')
    #startTroupeButton.location_once_scrolled_into_view()
    #startTroupeButton.click()

    troupeName = 'Troupe for ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())

    form = driver.find_element_by_css_selector('form#signup-form')
    inputBox = form.find_element_by_css_selector('input#troupeName')
    inputBox.send_keys(troupeName)
    driver.find_element_by_name('submit').click()
    time.sleep(1)

    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName

    # share dialog pops up because there is no one else in the troupe, invite someone
    form = driver.find_element_by_css_selector('form#share-form')

    # type and wait for autocomplete
    inputBox = form.find_element_by_name('inviteSearch')
    inputBox.send_keys('te')
    time.sleep(1)

    # expect two elements in the suggestions list
    suggestions = form.find_elements_by_css_selector('ul.typeahead li')
    assert len(suggestions) >= 2

    # finish typing in a full email address and send invite
    email = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime()) + '@troupetest.local'
    inputBox.send_keys(email[2:])
    inputBox.send_keys(Keys.ENTER)
    form.find_element_by_css_selector('button[type=submit]').click()

    success = driver.find_element_by_css_selector('div.modal-success.view')
    assert success.is_displayed()

    time.sleep(1)

    # login as invited user by accepting invite link
    queryurl = utils.baseUrl("/testdata/inviteAcceptLink?email=" + email)
    response = urllib2.urlopen(queryurl)
    acceptLink = response.read()

    driver.delete_all_cookies()
    driver.get(utils.baseUrl(acceptLink))

    form = driver.find_element_by_css_selector('#updateprofileform')
    form.find_element_by_css_selector('#displayName').send_keys('Another Test User')
    form.find_element_by_css_selector('#password').send_keys('123456')

    form.find_element_by_name('submit').click()

    # ensure the troupe name is the same as the one the invite was for
    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName

    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 2


# Follows on from last test
def testRemoveUserFromTroupe():
    troupeBefore = driver.find_element_by_css_selector('DIV.trpHeaderTitle').text

    for x in driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem'):
        x.click()
        if len(driver.find_elements_by_css_selector('#person-remove-button')) > 0:
            driver.find_element_by_css_selector('#person-remove-button').click()
            driver.find_element_by_css_selector('#button-yes').click()
    driver.find_element_by_css_selector('.trpSettingsButton a').click()
    driver.find_element_by_css_selector('#delete-troupe').click()
    driver.find_element_by_css_selector('#ok').click()

    troupeAfter = driver.find_element_by_css_selector('DIV.trpHeaderTitle').text
    assert(troupeBefore != troupeAfter)


def testCreateTroupeFromOneToOneTroupe():
    driver.delete_all_cookies()
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')

    queryurl = utils.baseUrl("/testdata/oneToOneLink?email=testuser2@troupetest.local")
    response = urllib2.urlopen(queryurl)
    oneToOneLink = response.read()

    driver.get(utils.baseUrl(oneToOneLink))

    # create troupe
    driver.find_element_by_css_selector('#people-create-troupe-button div').click()

    troupeName = 'Troupe for ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())

    form = driver.find_element_by_css_selector('#signup-form')
    form.find_element_by_css_selector('#troupeName').send_keys(troupeName)
    form.find_element_by_name('submit').click()

    time.sleep(0.5)

    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName

    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 2

    # invite the third person
    form = driver.find_element_by_css_selector('form#share-form')

    # type and wait for autocomplete
    inputBox = form.find_element_by_name('inviteSearch')
    inputBox.send_keys('Te')
    time.sleep(1)

    # expect at least two elements in the suggestions list
    suggestions = form.find_elements_by_css_selector('ul.typeahead li')
    assert len(suggestions) >= 2

    # select an existing user

    inputBox.send_keys(Keys.ARROW_DOWN)
    inputBox.send_keys(Keys.ENTER)

    time.sleep(2)

    # check that there is one invite ready to go
    invitesEl = driver.find_element_by_css_selector("#invites")
    invitesEl.size == 1

    # find the userId of the selected person
    userId = invitesEl.find_element_by_css_selector('.invite').get_attribute('data-value')

    form.find_element_by_css_selector('button[type=submit]').click()

    success = driver.find_element_by_css_selector('div.modal-success.view')
    assert success.is_displayed()

    queryurl = utils.baseUrl("/testdata/inviteAcceptLinkByUserId?userId=" + userId)
    response = urllib2.urlopen(queryurl)
    acceptLink = response.read()

    driver.delete_all_cookies()
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl(acceptLink))

    # ensure there are now 3 people in the same troupe
    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 3

    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text == troupeName


def teardown_module():
    utils.shutdown(driver)
