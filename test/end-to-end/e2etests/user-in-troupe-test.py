import utils
import string
import time

driver1 = None
driver2 = None


def findUserElement(elements, name):
    for i in range(0, len(elements)):
        title = elements[i].get_attribute('data-original-title')

        if string.find(title, name) >= 0:
            return elements[i]

    print('No match found for ' + name)
    return None


def setup_module():
    global driver1
    global driver2

    driver1 = utils.driver()
    driver2 = utils.secondDriver()


def testUsersComingOnlineAndGoingOffline():
    global driver1
    global driver2

    utils.existingUserlogin(driver1, 'testuser@troupetest.local', '123456')
    utils.existingUserlogin(driver2, 'testuser2@troupetest.local', '123456')

    time.sleep(1)

    user1 = driver1.find_element_by_xpath('//*[@id="people-roster"]/div/span/span/span[1]')
    user2 = driver1.find_element_by_xpath('//*[@id="people-roster"]/div/span/span/span[2]')

    assert user1 is not None
    assert user2 is not None

    user1Status = driver1.find_element_by_xpath('//*[@id="people-roster"]/div/span/span/span[1]/a/div/span/div')
    user2Status = driver1.find_element_by_xpath('//*[@id="people-roster"]/div/span/span/span[2]/a/div/span/div')

    assert user1Status is not None
    assert user2Status is not None

    assert string.find(user1Status.get_attribute('class'), 'online') >= 0
    assert string.find(user2Status.get_attribute('class'), 'online') >= 0

    driver2.quit()
    driver2 = None

    time.sleep(0.5)

    users2 = driver1.find_elements_by_css_selector('#people-roster .trpPeopleListItem .trpDisplayPicture')
    user2 = findUserElement(users2, 'Test User 2')

    assert user2 is not None
    assert string.find(user2.get_attribute('class'), 'offline') >= 0


# def teardown_module():
#     driver1.quit()
#     if driver2 is not None:
#         driver2.quit()
