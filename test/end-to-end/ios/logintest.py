
from selenium.webdriver.common.action_chains import ActionChains
import utils
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testSignInAndSignout():
    driver.get(baseUrl("/x"))


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
