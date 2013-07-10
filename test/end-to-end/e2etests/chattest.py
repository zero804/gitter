from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from nose.plugins.attrib import attr
import utils
import time
import os

driver = None

chatMessage = 'The date and time are now ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())


def setup_module():
    global driver
    driver = utils.driver()
    utils.resetData(driver)


@attr('unreliable')
def testSendingAChatMessage():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    textArea = driver.find_element_by_id('chat-input-textarea')

    textArea.send_keys(chatMessage)
    textArea.send_keys(Keys.RETURN)

    time.sleep(0.5)

    links = [i.text for i in driver.find_elements_by_css_selector('.trpChatItem .trpChatText')]
    text = links[len(links) - 1]

    assert text == chatMessage


@attr('unreliable')
def testEditingAChatMessage():
    driverName = os.getenv('DRIVER')
    if driverName != 'FIREFOX':
        lastChat = driver.find_element_by_css_selector('.trpChatItem')

        actionChain = ActionChains(driver)
        actionChain.move_to_element(driver.find_element_by_css_selector('.frame-people'))
        actionChain.perform()

        time.sleep(0.5)

        actionChain = ActionChains(driver)
        actionChain.move_to_element(driver.find_element_by_css_selector('.trpChatBox'))
        editButton = driver.find_element_by_css_selector('.trpChatEdit')
        actionChain.move_to_element(editButton)
        actionChain.click()
        actionChain.perform()

        # driver.find_element_by_css_selector('.trpChatEdit').click()

        editInput = lastChat.find_element_by_css_selector('.trpChatInput')

        editInput.send_keys("...an alteration")
        editInput.send_keys(Keys.RETURN)

        time.sleep(0.5)

        chatElText = getLastElement('.trpChatItem').find_element_by_css_selector('.trpChatText')
        assert chatElText.text.find("...an alteration") != -1


def getLastElement(selector):
    els = driver.find_elements_by_css_selector(selector)

    return els[len(els) - 1]


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
