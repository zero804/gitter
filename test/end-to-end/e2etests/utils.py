from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
import urllib2
import os
import time
import json


def baseUrl(url):
    base = os.getenv('BASE_URL')
    if(base is None):
        base = "http://localhost:5000"
    return base + url


def whichDriver():
    driverName = os.getenv('DRIVER')
    return driverName


def secondDriver():
    driverName = os.getenv('DRIVER')
    if driverName == 'IE':
        secondDriver = webdriver.Firefox()
    elif driverName == 'REMOTEIE':
        remote = os.getenv('REMOTE_EXECUTOR')
        if remote is None:
            remote = 'http://10.8.0.14:5555/wd/hub'
        secondDriver = webdriver.Remote(command_executor=remote, desired_capabilities=DesiredCapabilities.FIREFOX)
    else:
        secondDriver = driver()
    return secondDriver


def driver():
    driverName = os.getenv('DRIVER')
    if driverName is None:
        driverName = 'CHROME'

    remote = os.getenv('REMOTE_EXECUTOR')
    if remote is None:
        remote = 'http://10.8.0.14:5555/wd/hub'

    if driverName == 'FIREFOX':
        print('Using local Firefox')
        driver = webdriver.Firefox()

    elif driverName == 'IE':
        print('Using local IE')
        driver = webdriver.IE()

    elif driverName == 'PHANTOMJS':
        print('Using local PhantomJS')
        driver = webdriver.PhantomJS()

    elif driverName == 'CHROME':
        e2edir = os.path.dirname(os.path.abspath(__file__))
        driver = webdriver.Chrome(e2edir + '/../chromedriver/chromedriver')

    elif driverName == 'REMOTECHROME':
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=DesiredCapabilities.CHROME)

    elif driverName == 'REMOTEIE':
        print('Using remote IE')
        ie = {'platform': 'WINDOWS 7',
              'browserName': 'internet explorer',
              'version': '9',
              'javascriptEnabled': True,
              'ignoreZoomSetting': True}
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=ie)

    elif driverName == 'REMOTEFIREFOX':
        print('Using remote Firefox')
        driver = webdriver.Remote(command_executor=remote, desired_capabilities=DesiredCapabilities.FIREFOX)

    driver.delete_all_cookies()
    driver.implicitly_wait(30)

    driver.get(baseUrl("/signout"))

    driver.find_element_by_css_selector('DIV.trpHomeHeroStripContainer')

    driver.delete_all_cookies()

    return driver


def resetData(driver):
    driver.get(baseUrl('/testdata/reset'))


def existingUserlogin(driver, usernameValue, passwordValue):
    driver.get(baseUrl("/x"))

    time.sleep(0.5)

    existingButton = driver.find_element_by_css_selector("#button-existing-users-login")
    existingButton.click()

    time.sleep(0.5)

    name = driver.find_element_by_css_selector('#email')
    name.send_keys(usernameValue)

    password = driver.find_element_by_css_selector('#password')
    password.send_keys(passwordValue)

    driver.find_element_by_css_selector('#signin-button').click()

    time.sleep(1)

    driver.find_element_by_css_selector('DIV.trpHeaderWrapper')


def signup(driver):
    driver.get(baseUrl("/signout"))
    driver.get(baseUrl("/x"))
    thisTime = time.strftime("%Y%m%d%H%M%S", time.gmtime())
    emailAddress = 'testuser' + thisTime + '@troupetest.local'
    driver.find_element_by_css_selector('#button-signup').click()
    form = driver.find_element_by_css_selector('#signup-form')
    form.find_element_by_name('email').send_keys(emailAddress)
    form.find_element_by_name('submit').click()
    driver.find_element_by_css_selector('.label-signupsuccess')

    queryurl = baseUrl("/testdata/confirmationCodeForEmail?email=" + emailAddress)
    response = urllib2.urlopen(queryurl)
    confirmCode = response.read()

    # visit confirm link
    driver.get(baseUrl('/confirm/'+confirmCode))

    # choose a username
    username = 'testuser' + thisTime
    inputUser = driver.find_element_by_css_selector('input[name=username]')
    inputUser.send_keys(username)
    driver.find_element_by_css_selector('#username-form [type=submit]').click()

    # complete profile
    form = driver.find_element_by_css_selector('#updateprofileform')
    form.find_element_by_name('displayName').send_keys('Willey Waley')
    form.find_element_by_name('password').send_keys('123456')
    form.find_element_by_name('submit').click()
    return username


def screenshot(driver):
    e2edir = os.path.dirname(os.path.abspath(__file__))
    filename = os.path.abspath(e2edir + '/../../../output/screenshot-' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime()) + '.png')
    driver.get_screenshot_as_file(filename)


def getJSON(url):
    response = urllib2.urlopen(baseUrl(url)).read()
    return json.loads(response)


# cannot run during setup/teardown as stdout is ignored
def printJobInfo(driver):
    remote = os.getenv('REMOTE_EXECUTOR')
    if remote is not None:
        if 'saucelabs' in remote:
            print("Link to your job: https://saucelabs.com/jobs/%s" % driver.session_id)


def shutdown(driver):
    if(os.getenv('SELENIUM_DEV') is None):
        screenshot(driver)
        driver.quit()
