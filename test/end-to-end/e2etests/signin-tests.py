import utils
import os
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testSigninWithEmail():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    driver.find_elements_by_class_name('trpHeaderTitle')
    driver.get(utils.baseUrl("/signout"))


def testSigninWithUsername():
    utils.existingUserlogin(driver, 'testuser1', '123456')
    driver.find_elements_by_class_name('trpHeaderTitle')
    driver.get(utils.baseUrl("/signout"))


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
