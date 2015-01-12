import utils
import os
import time
from nose.plugins.attrib import attr
import unittest


class FileTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)
        utils.resetData(self.driver)

    def tearDown(self):
        self.driver.quit()

    def testFileAreaExists(self):
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        self.driver.get(utils.baseUrl("/filetesttroupe"))
        self.driver.find_elements_by_class_name('trpFileSmallThumbnail')
        self.driver.get(utils.baseUrl("/logout"))

    # This test only runs in IE
    def testFileUpload(self):
        driverName = os.getenv('driver')
        if driverName == 'REMOTEIE':
            utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
            self.driver.get(utils.baseUrl("/filetesttroupe"))
            self.driver.find_element_by_name("file").send_keys('c:\\ProgramData\Microsoft\User Account Pictures\user.bmp')
            self.driver.find_elements_by_class_name('trpFileVersionThumbnail')
            self.driver.get(utils.baseUrl("/logout"))

    @attr('unreliable')
    def testPreviewFile(self):
        driverName = os.getenv('driver')
        if driverName == 'REMOTEIE':
            utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
            self.driver.get(utils.baseUrl("/filetesttroupe"))
            # self.driver.find_element_by_xpath('//*[@id="file-list"]/div/span/div/a').click()
            self.driver.find_element_by_class_name("trpFileSmallThumbnailImage").click()
            self.driver.find_element_by_class_name("link-preview").click()
            time.sleep(1)
            self.driver.find_element_by_class_name("close").click()
            self.driver.get(utils.baseUrl("/logout"))

    @attr('unreliable')
    def testDeleteFile(self):
        driverName = os.getenv('driver')
        if driverName == 'REMOTEIE':
            utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
            self.driver.get(utils.baseUrl("/filetesttroupe"))
            numberOfImages = self.driver.find_elements_by_class_name("trpFileSmallThumbnailImage")
            # self.driver.find_element_by_xpath('//*[@id="file-list"]/div/span/div/a').click()
            self.driver.find_element_by_class_name("trpFileSmallThumbnailImage").click()
            self.driver.find_element_by_class_name("trpButtonMenu").click()
            self.driver.find_element_by_class_name("link-delete").click()
            self.driver.find_element_by_id("yes").click()
            newNumberOfImages = self.driver.find_elements_by_class_name("trpFileSmallThumbnailImage")
            if numberOfImages == newNumberOfImages:
                assert(False)
            self.driver.get(utils.baseUrl("/logout"))
