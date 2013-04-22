
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
import utils
import time

driver = None

chatMessage = 'The date and time are now ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())


def setup_module():
    global driver
    driver = utils.driver()


def testSendingAChatMessage():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    textArea = driver.find_element_by_id('chat-input-textarea')

    textArea.send_keys(chatMessage)
    textArea.send_keys(Keys.ENTER)

    time.sleep(0.5)

    links = [i.text for i in driver.find_elements_by_css_selector('.trpChatItem .trpChatText')]
    text = links[len(links) - 1]

    assert text == chatMessage


def testEditingAChatMessage():
    # textArea = driver.find_element_by_id('chat-input-textarea')

    # chatMessage = 'The date and time are now ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())
    # textArea.send_keys(chatMessage)
    # textArea.send_keys(Keys.ENTER)

    # time.sleep(0.5)

    lastChat = getLastElement('.trpChatItem')
    editButton = lastChat.find_element_by_css_selector('.trpChatEdit')

    actionChain = ActionChains(driver)
    actionChain.move_to_element(lastChat.find_element_by_css_selector('.trpChatDetails'))
    actionChain.click(editButton)
    actionChain.perform()

    editInput = lastChat.find_element_by_css_selector('.trpChatInput')

    editInput.send_keys("...an alteration")
    editInput.send_keys(Keys.ENTER)

    time.sleep(0.5)

    # editInput = lastChat.find_element_by_css_selector('.trpChatInput')
    # assert not editInput

    chatElText = getLastElement('.trpChatItem').find_element_by_css_selector('.trpChatText')
    assert chatElText.text.find("...an alteration") != -1


def getLastElement(selector):
    els = driver.find_elements_by_css_selector(selector)

    return els[len(els) - 1]


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
