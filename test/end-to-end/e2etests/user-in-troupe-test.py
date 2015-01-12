import utils
import string
import time
from nose.plugins.attrib import attr
import unittest


class UserInTroupeTests(unittest.TestCase):

    def setUp(self):
        self.driver1 = utils.self.driver()
        self.driver2 = utils.secondself.driver()
        utils.printJobInfo(self.driver1)
        utils.printJobInfo(self.driver2)

    def tearDown(self):
        self.driver1.quit()
        if self.driver2 is not None:
            self.driver2.quit()

    @attr('unreliable')
    def testUsersComingOnlineAndGoingOffline(self):

        utils.existingUserlogin(self.driver1, 'testuser@troupetest.local', '123456')
        utils.existingUserlogin(self.driver2, 'testuser2@troupetest.local', '123456')

        print('Logged into both clients, now navigating to testtroupe1')

        self.driver1.get(utils.baseUrl("/testtroupe1"))
        self.driver2.get(utils.baseUrl("/testtroupe1"))

        user1 = self.driver1.find_element_by_xpath('//*[@id="people-roster"]/div/span/span/span[1]')
        user2 = self.driver1.find_element_by_xpath('//*[@id="people-roster"]/div/span/span/span[2]')

        assert user1 is not None
        assert user2 is not None

        print('Found both users ok')

        user1Status = self.driver1.find_element_by_xpath('//*[@id="people-roster"]/div/span/span/span[1]/a/div/span/div')
        user2Status = self.driver1.find_element_by_xpath('//*[@id="people-roster"]/div/span/span/span[2]/a/div/span/div')

        assert user1Status is not None
        assert user2Status is not None

        assert string.find(user1Status.get_attribute('class'), 'online') >= 0
        assert string.find(user2Status.get_attribute('class'), 'online') >= 0

        print('Both users are online')

        # self.driver2.quit()
        # self.driver2 = None

        print('signing out of Firefox browser')
        self.driver2.get(utils.baseUrl("/logout"))

        time.sleep(0.5)

        print('checking status of user who was in Firefox and should now be offline')
        user2Status = self.driver1.find_element_by_xpath('//*[@id="people-roster"]/div/span/span/span[2]/a/div/span/div')

        assert string.find(user2Status.get_attribute('class'), 'offline') >= 0


def findUserElement(elements, name):
    for i in range(0, len(elements)):
        title = elements[i].get_attribute('data-original-title')

        if string.find(title, name) >= 0:
            return elements[i]

    print('No match found for ' + name)
    return None
