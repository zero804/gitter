from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
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
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        self.driver.get(utils.baseUrl('/testtroupe1'))

    def tearDown(self):
        self.driver.quit()

    def sendAChatMessage(self):
        textArea = self.driver.find_element_by_id('chat-input-textarea')
        textArea.send_keys(chatMessage)
        textArea.send_keys(Keys.RETURN)

        time.sleep(0.5)

        links = [i.text for i in self.driver.find_elements_by_css_selector('.trpChatItem .trpChatText')]
        text = links[len(links) - 1]

        assert text == chatMessage

        return text

    def test1SendAndEditAChatMessage(self):
        self.sendAChatMessage()
        self.editAChatMessage()

    @attr('unreliable')
    def test2ScrollBehaviourThenInfiniteScroll(self):

        # TODO to use a second driver the chat elements need to keep their id in a data-id attribute
        # self.driver2 = utils.secondDriver()
        # utils.existingUserlogin(self.driver2, 'testuser2@troupetest.local', '123456')
        # self.driver2.get(utils.baseUrl('/testtroupe1'))

        time.sleep(1)

        for i in range(21):
            self.sendAChatMessage()
            lastMsg = self.getLastElement('.trpChatItem')
            assert lastMsg.is_displayed()  # ensure the scroll is still at the bottom of the page

        self.driver.get(self.driver.current_url)  # refresh to unload old messages
        numChatsLoaded = len(self.driver.find_elements_by_css_selector('.trpChatItem'))

        time.sleep(2)

        self.driver.find_element_by_css_selector('.trpChatItem').location_once_scrolled_into_view
        self.driver.find_element_by_css_selector('#frame-chat').location_once_scrolled_into_view
        self.driver.find_element_by_css_selector('#chat-frame').location_once_scrolled_into_view
        self.driver.find_element_by_css_selector('body').location_once_scrolled_into_view

        time.sleep(2)

        newChatsLoaded = len(self.driver.find_elements_by_css_selector('.trpChatItem'))

        assert newChatsLoaded > numChatsLoaded, "Infinite scroll did not load older chats"

    def editAChatMessage(self):
        self.driverName = os.getenv('driver')
        if self.driverName != 'FIREFOX':
            lastChat = self.driver.find_element_by_css_selector('.trpChatItem')

            self.driver.find_element_by_css_selector('.trpChatBox').click();
            WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.CSS_SELECTOR, '.trpChatEdit')))
            self.driver.find_element_by_css_selector('.trpChatEdit').click();
            WebDriverWait(self.driver, 10).until(EC.visibility_of_element_located((By.CSS_SELECTOR, '.trpChatInput')))

            editInput = lastChat.find_element_by_css_selector('.trpChatInput')

            editInput.send_keys("...an alteration")
            editInput.send_keys(Keys.RETURN)

            time.sleep(0.5)

            chatElText = self.getLastElement('.trpChatItem').find_element_by_css_selector('.trpChatText')
            assert chatElText.text.find("...an alteration") != -1

    def getLastElement(self, selector, driver=0):
        if not driver:
            driver = self.driver
        els = driver.find_elements_by_css_selector(selector)

        return els[len(els) - 1]
