
from selenium.webdriver.common.keys import Keys
import utils
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testSignInAndSignout():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    textArea = driver.find_element_by_id('chat-input-textarea')

    chatMessage = 'The date and time are now ' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())
    textArea.send_keys(chatMessage)
    textArea.send_keys(Keys.ENTER)

    time.sleep(0.5)

    links = [i.text for i in driver.find_elements_by_css_selector('.trpChatItem .trpChatText')]
    text = links[len(links) - 1]

    assert text == chatMessage


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
