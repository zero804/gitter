from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from nose.plugins.attrib import attr
import utils
import time
import os
import unittest

chatMessage = 'The date and time are now ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())


class ChatTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)
        utils.resetData(self.driver)

    def tearDown(self):
        self.driver.quit()

    @attr('unreliable')
    def testSendingAChatMessage(self):
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        textArea = self.driver.find_element_by_id('chat-input-textarea')

        textArea.send_keys(chatMessage)
        textArea.send_keys(Keys.RETURN)

        time.sleep(0.5)

        links = [i.text for i in self.driver.find_elements_by_css_selector('.trpChatItem .trpChatText')]
        text = links[len(links) - 1]

        assert text == chatMessage

    @attr('unreliable')
    def testEditingAChatMessage(self):
        self.driverName = os.getenv('driver')
        if self.driverName != 'FIREFOX':
            lastChat = self.driver.find_element_by_css_selector('.trpChatItem')

            actionChain = ActionChains(self.driver)
            actionChain.move_to_element(self.driver.find_element_by_css_selector('.frame-people'))
            actionChain.perform()

            time.sleep(0.5)

            actionChain = ActionChains(self.driver)
            actionChain.move_to_element(self.driver.find_element_by_css_selector('.trpChatBox'))
            editButton = self.driver.find_element_by_css_selector('.trpChatEdit')
            actionChain.move_to_element(editButton)
            actionChain.click()
            actionChain.perform()

            # self.driver.find_element_by_css_selector('.trpChatEdit').click()

            editInput = lastChat.find_element_by_css_selector('.trpChatInput')

            editInput.send_keys("...an alteration")
            editInput.send_keys(Keys.RETURN)

            time.sleep(0.5)

            chatElText = self.getLastElement('.trpChatItem').find_element_by_css_selector('.trpChatText')
            assert chatElText.text.find("...an alteration") != -1

    def getLastElement(self, selector):
        els = self.driver.find_elements_by_css_selector(selector)

        return els[len(els) - 1]
