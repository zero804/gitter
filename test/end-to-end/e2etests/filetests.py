import utils
import os
import time

driver = None


def setup_module():
    global driver
    driver = utils.driver()


def testFileAreaExists():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    driver.get(utils.baseUrl("filetesttroupe"))
    driver.find_elements_by_class_name('trpFileSmallThumbnail')
    driver.get(utils.baseUrl("signout"))


# This test only runs in IE
def testFileUpload():
    driverName = os.getenv('DRIVER')
    if driverName == 'REMOTEIE':
        utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
        driver.get(utils.baseUrl("filetesttroupe"))
        driver.find_element_by_name("file").send_keys('c:\\test\image.jpg')
        driver.find_elements_by_class_name('trpFileVersionThumbnail')
        driver.get(utils.baseUrl("signout"))


def testDeleteFile():
    utils.existingUserlogin(driver, 'testuser@troupetest.local', '123456')
    driver.get(utils.baseUrl("filetesttroupe"))
    numberOfImages = driver.find_elements_by_class_name("trpFileSmallThumbnailImage")
    driver.find_element_by_xpath('//*[@id="file-list"]/div/span/div/a').click()
    driver.find_element_by_class_name("trpButtonMenu").click()
    driver.find_element_by_class_name("link-delete").click()
    driver.find_element_by_id("yes").click()
    newNumberOfImages = driver.find_elements_by_class_name("trpFileSmallThumbnailImage")
    if numberOfImages == newNumberOfImages:
        assert(False)


def teardown_module():
    utils.screenshot(driver)
    driver.quit()
