import utils
from selenium.webdriver.common.keys import Keys
from nose.plugins.attrib import attr
import time
import unittest


class TroupeSettingsTests(unittest.TestCase):

    def setUp(self):
        self.driver = utils.driver()
        utils.printJobInfo(self.driver)

    def tearDown(self):
        self.driver.quit()

    @attr('unreliable')
    def testTroupeRenameWorks(self):
        utils.existingUserlogin(self.driver, 'testuser@troupetest.local', '123456')
        time.sleep(0.4)

        if(self.driver.current_url.find("/testtroupe1") == -1):
            self.driver.get(utils.baseUrl("/testtroupe1"))

        link = self.driver.find_element_by_css_selector('.trpSettingsButton A img')
        while(not link.is_displayed()):
            time.sleep(0.4)
        link.click()

        form = self.driver.find_element_by_css_selector('form#troupeSettings')

        inputBox = form.find_element_by_name('name')
        for i in range(len(inputBox.get_attribute('value'))):
            inputBox.send_keys(Keys.BACK_SPACE)

        inputBox.send_keys('New Troupe Name')
        self.driver.find_element_by_css_selector('button#save-troupe-settings').click()

        time.sleep(0.5)

        header = self.driver.find_element_by_css_selector('div.trpHeaderTitle')
        assert header.text == "New Troupe Name"

        self.driver.find_element_by_css_selector('.trpSettingsButton A img').click()

        form = self.driver.find_element_by_css_selector('form#troupeSettings')

        inputBox = form.find_element_by_name('name')
        for i in range(len(inputBox.get_attribute('value'))):
            inputBox.send_keys(Keys.BACK_SPACE)
        inputBox.send_keys('Test Troupe 1')
        self.driver.find_element_by_css_selector('button#save-troupe-settings').click()

        time.sleep(0.5)

        header = self.driver.find_element_by_css_selector('div.trpHeaderTitle')
        assert header.text == "Test Troupe 1"

    # TODO this test isn't clicking on confirm (no error message though), and it can't see the url changing
    def leaveTroupe(self):
        if(self.driver.current_url.find("/testtroupe3") == -1):
            self.driver.get(utils.baseUrl("/testtroupe3"))

        link = self.driver.find_element_by_css_selector('.trpSettingsButton A img')
        while(not link.is_displayed()):
            time.sleep(0.4)
        link.click()

        # check for leave button
        leaveTroupeBtn = self.driver.find_element_by_css_selector('#leave-troupe')
        assert(leaveTroupeBtn.is_displayed())

        # check for delete button
        deleteTroupeBtn = self.driver.find_element_by_css_selector('#delete-troupe')
        assert(not deleteTroupeBtn.is_displayed())

        # click delete
        leaveTroupeBtn.click()

        current_url = self.driver.current_url

        # click ok on confirm dialog
        self.driver.find_element_by_css_selector('#ok').click()

        # we should be redirected to another url
        assert(current_url != self.driver.current_url)
