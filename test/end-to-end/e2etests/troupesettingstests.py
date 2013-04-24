import utils
from selenium.webdriver.common.keys import Keys
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testTroupeRenameWorks():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    time.sleep(0.4)

    if(driver.current_url.find("/testtroupe1") == -1):
        driver.get(utils.baseUrl("/testtroupe1"))

    link = driver.find_element_by_css_selector('.trpSettingsButton A img')
    while(not link.is_displayed()):
        time.sleep(0.4)
    link.click()

    form = driver.find_element_by_css_selector('form#troupeSettings')

    inputBox = form.find_element_by_name('name')
    for i in range(len(inputBox.get_attribute('value'))):
        inputBox.send_keys(Keys.BACK_SPACE)

    inputBox.send_keys('New Troupe Name')
    driver.find_element_by_css_selector('button#save-troupe-settings').click()

    time.sleep(0.5)

    header = driver.find_element_by_css_selector('div.trpHeaderTitle')
    assert header.text == "New Troupe Name"

    driver.find_element_by_css_selector('.trpSettingsButton A img').click()

    form = driver.find_element_by_css_selector('form#troupeSettings')

    inputBox = form.find_element_by_name('name')
    for i in range(len(inputBox.get_attribute('value'))):
        inputBox.send_keys(Keys.BACK_SPACE)
    inputBox.send_keys('Test Troupe 1')
    driver.find_element_by_css_selector('button#save-troupe-settings').click()

    time.sleep(0.5)

    header = driver.find_element_by_css_selector('div.trpHeaderTitle')
    assert header.text == "Test Troupe 1"


def teardown_module():
    utils.shutdown(driver)
