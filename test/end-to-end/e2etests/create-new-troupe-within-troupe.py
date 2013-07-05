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

    driver.execute_script('$("a #left-menu-new-troupe-button").click()')
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
    assert header.text.find(troupeName) >= 0

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
    emailuser = 'testuser.' + time.strftime("%Y%m%d%H%M%S", time.gmtime())
    email = emailuser + '@troupetest.local'
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
    # header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    # assert header.text.find(troupeName) >= 0

    # assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 2

    # choose username for this new user
    usernameInput = driver.find_element_by_css_selector('#username-form input[name=username]')
    usernameInput.send_keys(emailuser)
    driver.find_element_by_css_selector('#username-form [type=submit]').click()


# Follows on from last test
def testRemoveUserFromTroupe():
    #troupeBefore = driver.find_element_by_css_selector('DIV.trpHeaderTitle').text

    time.sleep(1)
    for x in driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem'):
        x.click()
        time.sleep(1)
        thisUsersDisplayName = driver.find_element_by_css_selector('.trpRightPanel .trpDisplayName')
        if not thisUsersDisplayName.text.find("Another Test User") >= 0:
            driver.find_element_by_css_selector('#person-remove-button').click()
            time.sleep(1)
            driver.find_element_by_css_selector('#button-yes').click()
    driver.find_element_by_css_selector('.trpSettingsButton a').click()
    driver.find_element_by_css_selector('#delete-troupe').click()
    driver.find_element_by_css_selector('#ok').click()

    #time.sleep(1)
    #troupeAfter = driver.find_element_by_css_selector('DIV.trpHeaderTitle').text
    #assert(troupeBefore != troupeAfter)


def testCreateTroupeFromOneToOneTroupe():
    # Login as Test User 1
    driver.delete_all_cookies()
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')

    # Visit a one to one with Test User 2
    queryurl = utils.baseUrl("/testdata/oneToOneLink?email=testuser2@troupetest.local")
    response = urllib2.urlopen(queryurl)
    oneToOneLink = response.read()
    driver.get(utils.baseUrl(oneToOneLink))

    # Upgrade this one to one to a proper troupe
    driver.find_element_by_css_selector('#people-create-troupe-button div').click()

    troupeName = 'Troupe for ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())
    form = driver.find_element_by_css_selector('#signup-form')
    form.find_element_by_css_selector('#troupeName').send_keys(troupeName)
    form.find_element_by_name('submit').click()

    time.sleep(0.5)

    # Ensure we are in the new troupe, with the Test User 2 as well
    header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    assert header.text.find(troupeName) >= 0
    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 2

    # Invite the third person
    form = driver.find_element_by_css_selector('form#share-form')
    # type and wait for autocomplete
    inputBox = form.find_element_by_name('inviteSearch')
    inputBox.send_keys('testuser3@troupetest.local')
    # select an existing user
    time.sleep(1)
    inputBox.send_keys(Keys.ENTER)
    time.sleep(2)

    # check that there is one invite ready to go
    invitesEl = driver.find_element_by_css_selector("#invites")
    # find the userId of the selected person
    userId = invitesEl.find_element_by_css_selector('.invite').get_attribute('data-value')
    # Submit the form, adding the new user
    form.find_element_by_css_selector('button[type=submit]').click()
    time.sleep(1)
    # the success message shows
    success = driver.find_element_by_css_selector('div.modal-success.view')
    assert success.is_displayed()

    # There should be an invite for the user that we invited to this normal troupe
    # Get the invite code and accept it
    queryurl = utils.baseUrl("/testdata/inviteAcceptLink?email=testuser3@troupetest.local")
    response = urllib2.urlopen(queryurl)
    acceptLink = response.read()

    driver.delete_all_cookies()
    driver.get(utils.baseUrl("/signout"))
    driver.get(utils.baseUrl(acceptLink))

    # login as Test User 3 to accept the invite
    name = driver.find_element_by_css_selector('#email')
    name.clear()
    name.send_keys("testuser3@troupetest.local")

    password = driver.find_element_by_css_selector('#password')
    password.send_keys("123456")

    driver.find_element_by_css_selector('#signin-button').click()

    time.sleep(1)

    driver.find_element_by_css_selector('DIV.trpHeaderWrapper')

    # Accept the invite
    driver.find_element_by_css_selector("#accept-invite").click()

    # ensure there are now 3 people in the same troupe
    assert len(driver.find_elements_by_css_selector('#people-roster div.trpPeopleListItem')) == 3

    # header = driver.find_element_by_css_selector('DIV.trpHeaderTitle')
    # assert header.text.find(troupeName) >= 0


def teardown_module():
    utils.resetData(driver)
    utils.shutdown(driver)
